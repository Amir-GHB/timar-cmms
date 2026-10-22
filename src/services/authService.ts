import { getDB } from './db';
import type { User, Role, UserCredential } from '../types';
import {
  hashPassword,
  verifyPassword,
  normalizeUsername,
  validatePasswordStrength,
  validateUsernameFormat,
} from '../utils/crypto';
import { TimeService } from '../utils/timeService';
import { DEFAULT_APPS_SCRIPT_URL } from '../config/constants';

const AUTH_USER_STORAGE_KEY = 'timar_auth_user';

export class AuthService {
  private static activeUser: User | null = null;
  private static listeners: ((user: User | null) => void)[] = [];

  public static subscribe(listener: (user: User | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify(user: User | null): void {
    for (const l of this.listeners) {
      l(user);
    }
  }

  /**
   * Retrieves the configured Google Apps Script Web App URL from database,
   * falling back to the default cloud endpoint if none is saved.
   */
  public static async getConfiguredScriptUrl(): Promise<string> {
    try {
      const db = await getDB();
      const setting = await db.get('settings', 'appsScriptUrl');
      if (setting && typeof setting.value === 'string' && setting.value.trim()) {
        return setting.value.trim();
      }
    } catch {
      // Fallback
    }
    return DEFAULT_APPS_SCRIPT_URL;
  }

  /**
   * Restores the last locally cached user without server session tokens.
   * This is an intentionally temporary tokenless implementation.
   */
  public static async init(_scriptUrl?: string): Promise<User | null> {
    try {
      // Remove any persisted token-based session from earlier app versions.
      localStorage.removeItem('timar_auth_session');
      const stored = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (!stored) {
        this.activeUser = null;
        this.notify(null);
        return null;
      }

      const parsed = JSON.parse(stored) as User;
      if (!parsed?.id) {
        this.clearAuthState();
        return null;
      }

      const db = await getDB();
      const localUser = await db.get('users', parsed.id);
      if (!localUser || localUser.isActive === false) {
        this.clearAuthState();
        return null;
      }

      this.activeUser = localUser;
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(localUser));
      this.notify(localUser);
      return localUser;
    } catch {
      this.clearAuthState();
      return null;
    }
  }

  public static getCurrentUser(): User | null {
    if (this.activeUser?.isActive === false) {
      this.clearAuthState();
      return null;
    }
    return this.activeUser;
  }

  /**
   * Authenticates against backend or secure local store with PBKDF2 verification.
   * Universal bypasses are strictly rejected.
   */
  public static async login(
    usernameInput: string,
    passwordInput: string,
    scriptUrl?: string
  ): Promise<{ success: boolean; message?: string; user?: User; isNetworkError?: boolean; isServerError?: boolean }> {
    const username = normalizeUsername(usernameInput);
    const password = passwordInput ? passwordInput.trim() : '';

    if (!username || !password) {
      return { success: false, message: 'لطفاً نام کاربری و رمز عبور را وارد نمایید.' };
    }

    const endpoint = scriptUrl || (await this.getConfiguredScriptUrl());

    // Try cloud authentication first if endpoint is configured and online
    if (endpoint && endpoint.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'login',
            username,
            password,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.user) {
            // Check if user is active
            if (result.user.isActive === false) {
              return { success: false, message: 'این حساب کاربری غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.' };
            }

            const db = await getDB();
            await db.put('users', result.user);

            // Cache a local password hash for offline login, without creating a token.
            const now = TimeService.now();
            const pHash = await hashPassword(password);
            await db.put('userCredentials', {
              userId: result.user.id,
              usernameNormalized: username,
              passwordHash: pHash,
              updatedAt: now,
            });

            this.activeUser = result.user;
            localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(result.user));
            this.notify(result.user);
            return { success: true, user: result.user };
          }

          if (result.success === false) {
            if (result.message?.includes('غیرفعال') || result.error?.includes('غیرفعال')) {
              return { success: false, message: 'این حساب کاربری غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.' };
            }
            // Generic security error: do not disclose whether username or password was incorrect
            return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است.' };
          }
        } else {
          return {
            success: false,
            message: `پاسخ ناموفق از سرور ابری (کد خطا: ${response.status}). لطفاً آدرس سرور را بررسی نمایید.`,
            isServerError: true,
          };
        }
      } catch (err: unknown) {
        // Network error / connection failure
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (!isOffline) {
          return {
            success: false,
            message: 'امکان برقراری ارتباط با سرور ابری وجود ندارد. لطفاً اتصال اینترنت یا آدرس وب‌اپلیکیشن را بررسی نمایید.',
            isNetworkError: true,
          };
        }
      }
    }

    // Local authentication: Only when device is offline or no cloud endpoint configured
    const db = await getDB();
    const cred = await db.getFromIndex('userCredentials', 'by-username', username);
    if (!cred) {
      return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است.' };
    }

    const isValid = await verifyPassword(password, cred.passwordHash);
    if (!isValid) {
      return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است.' };
    }

    const user = await db.get('users', cred.userId);
    if (!user) {
      return { success: false, message: 'حساب کاربری یافت نشد.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'این حساب کاربری غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.' };
    }

    this.activeUser = user;
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    this.notify(user);

    return { success: true, user };
  }

  /** Clears the locally cached authenticated user. */
  public static async logout(_scriptUrl?: string): Promise<void> {
    this.clearAuthState();
  }

  private static clearAuthState(): void {
    this.activeUser = null;
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem('timar_auth_session');
    this.notify(null);
  }

  /**
   * Manager-only user creation with username uniqueness check and PBKDF2 hashing.
   */
  public static async createUser(
    userData: {
      fullName: string;
      username: string;
      role: Role;
      department: string;
      password: string;
      isActive?: boolean;
    },
    scriptUrl?: string
  ): Promise<{ success: boolean; message: string; user?: User }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, message: 'تنها مدیر سیستم مجاز به ایجاد حساب کاربری است.' };
    }

    const usernameCheck = validateUsernameFormat(userData.username);
    if (!usernameCheck.isValid) {
      return { success: false, message: usernameCheck.message || 'نام کاربری نامعتبر است.' };
    }

    const passCheck = validatePasswordStrength(userData.password);
    if (!passCheck.isValid) {
      return { success: false, message: passCheck.message || 'رمز عبور حداقل باید ۱۲ کاراکتر باشد.' };
    }

    if (!userData.fullName.trim()) {
      return { success: false, message: 'نام و نام خانوادگی الزامی است.' };
    }

    const normalized = normalizeUsername(userData.username);

    // Call server if configured and online
    if (scriptUrl && scriptUrl.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'createUser',
            actingUser: currentUser,
            userData: {
              fullName: userData.fullName.trim(),
              username: normalized,
              role: userData.role,
              department: userData.department.trim(),
              password: userData.password,
              isActive: userData.isActive !== undefined ? userData.isActive : true,
            },
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          return { success: false, message: result.message || result.error || 'خطا در ثبت کاربر در سرور ابری.' };
        }

        const db = await getDB();
        await db.put('users', result.user);
        return { success: true, message: 'کاربر جدید با موفقیت در سرور ابری ایجاد شد.', user: result.user };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `خطا در ارتباط با سرور: ${msg}` };
      }
    }

    // Local atomic check and creation
    const db = await getDB();
    const existingCred = await db.getFromIndex('userCredentials', 'by-username', normalized);
    const existingUser = await db.getFromIndex('users', 'by-username', normalized);
    if (existingCred || existingUser) {
      return { success: false, message: 'این نام کاربری قبلاً در سامانه ثبت شده است.' };
    }

    const now = TimeService.now();
    const newUserId = `usr-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const pHash = await hashPassword(userData.password);

    const newUser: User = {
      id: newUserId,
      username: normalized,
      fullName: userData.fullName.trim(),
      role: userData.role,
      department: userData.department.trim(),
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      updatedAt: now,
    };

    const newCred: UserCredential = {
      userId: newUserId,
      usernameNormalized: normalized,
      passwordHash: pHash,
      updatedAt: now,
    };

    await db.put('users', newUser);
    await db.put('userCredentials', newCred);

    return { success: true, message: 'کاربر جدید با موفقیت ایجاد شد.', user: newUser };
  }

  /**
   * Reset password for an account (Manager only).
   */
  public static async resetPassword(
    targetUserId: string,
    newPassword: string,
    scriptUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, message: 'تنها مدیر سیستم مجاز به تغییر رمز عبور کاربران است.' };
    }

    const passCheck = validatePasswordStrength(newPassword);
    if (!passCheck.isValid) {
      return { success: false, message: passCheck.message || 'رمز عبور حداقل باید ۱۲ کاراکتر باشد.' };
    }

    if (scriptUrl && scriptUrl.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'resetPassword',
            actingUser: currentUser,
            targetUserId,
            newPassword,
          }),
        });
        const result = await response.json();
        if (result.success) {
          return { success: true, message: 'رمز عبور کاربر در سرور ابری با موفقیت بازنشانی شد.' };
        }
        return { success: false, message: result.message || result.error || 'خطا در بازنشانی رمز.' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `خطا در ارتباط با سرور: ${msg}` };
      }
    }

    const db = await getDB();
    const cred = await db.get('userCredentials', targetUserId);
    if (!cred) {
      return { success: false, message: 'اطلاعات کاربری یافت نشد.' };
    }

    const pHash = await hashPassword(newPassword);
    cred.passwordHash = pHash;
    cred.updatedAt = TimeService.now();
    await db.put('userCredentials', cred);

    return { success: true, message: 'رمز عبور با موفقیت به‌روزرسانی شد.' };
  }

  /**
   * Toggle user active state or update role (Manager only).
   * Prevents disabling or demoting the last active manager.
   */
  public static async updateUserStatus(
    targetUserId: string,
    updates: { isActive?: boolean; role?: Role; department?: string; fullName?: string },
    allUsers: User[],
    scriptUrl?: string
  ): Promise<{ success: boolean; message: string; updatedUser?: User }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'manager') {
      return { success: false, message: 'تنها مدیر سیستم مجاز به تغییر اطلاعات کاربران است.' };
    }

    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, message: 'کاربر مورد نظر یافت نشد.' };
    }

    // Safety check: Prevent deactivating or demoting the last active manager
    const activeManagers = allUsers.filter((u) => u.role === 'manager' && u.isActive);
    const isTargetActiveManager = targetUser.role === 'manager' && targetUser.isActive;

    if (isTargetActiveManager && activeManagers.length <= 1) {
      if (updates.isActive === false) {
        return { success: false, message: 'امکان غیرفعال‌سازی تنها مدیر فعال سیستم وجود ندارد.' };
      }
      if (updates.role && updates.role !== 'manager') {
        return { success: false, message: 'امکان تنزل رتبه تنها مدیر فعال سیستم وجود ندارد.' };
      }
    }

    if (scriptUrl && scriptUrl.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateUser',
            actingUser: currentUser,
            targetUserId,
            updates,
          }),
        });
        const result = await response.json();
        if (result.success && result.user) {
          const db = await getDB();
          await db.put('users', result.user);
          return { success: true, message: 'اطلاعات کاربر با موفقیت در سرور به‌روزرسانی شد.', updatedUser: result.user };
        }
        return { success: false, message: result.message || result.error || 'خطا در ویرایش کاربر.' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `خطا در ارتباط با سرور: ${msg}` };
      }
    }

    const db = await getDB();
    const updated: User = {
      ...targetUser,
      ...updates,
      updatedAt: TimeService.now(),
    };
    await db.put('users', updated);

    if (this.activeUser?.id === targetUserId && updates.isActive === false) {
      this.clearAuthState();
    }

    return { success: true, message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.', updatedUser: updated };
  }

  /**
   * Checks whether at least one active manager exists in the cloud backend or locally.
   */
  public static async checkManagerExists(scriptUrl?: string): Promise<boolean> {
    const endpoint = scriptUrl || (await this.getConfiguredScriptUrl());
    if (endpoint && endpoint.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'checkManagerExists' }),
        });
        if (response.ok) {
          const result = await response.json();
          if (typeof result.hasManager === 'boolean') {
            return result.hasManager;
          }
        }
      } catch {
        // Fallback to local check
      }
    }
    const db = await getDB();
    const users = await db.getAll('users');
    return users.some((u) => u.role === 'manager' && u.isActive);
  }

  /**
   * One-time secure first-manager bootstrap.
   * Can only execute if NO active manager exists in the database.
   */
  public static async bootstrapFirstManager(
    data: { fullName: string; username: string; password: string; department?: string },
    scriptUrl?: string
  ): Promise<{ success: boolean; message: string; user?: User }> {
    const usernameCheck = validateUsernameFormat(data.username);
    if (!usernameCheck.isValid) {
      return { success: false, message: usernameCheck.message || 'نام کاربری نامعتبر است.' };
    }
    const passCheck = validatePasswordStrength(data.password);
    if (!passCheck.isValid) {
      return { success: false, message: passCheck.message || 'گذرواژه باید حداقل ۱۲ کاراکتر و دارای پیچیدگی لازم باشد.' };
    }
    if (!data.fullName.trim()) {
      return { success: false, message: 'نام و نام خانوادگی الزامی است.' };
    }

    const endpoint = scriptUrl || (await this.getConfiguredScriptUrl());
    if (endpoint && endpoint.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'bootstrapFirstManager',
            fullName: data.fullName.trim(),
            username: normalizeUsername(data.username),
            password: data.password,
            department: data.department ? data.department.trim() : 'مدیریت فنی و مهندسی',
          }),
        });
        const result = await response.json();
        if (result.success && result.user) {
          const db = await getDB();
          await db.put('users', result.user);
          return { success: true, message: 'مدیر ارشد سیستم با موفقیت ایجاد شد.', user: result.user };
        }
        return { success: false, message: result.message || result.error || 'خطا در ثبت مدیر ارشد.' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `خطا در ارتباط با سرور: ${msg}` };
      }
    }

    // Local check
    const db = await getDB();
    const existing = await db.getAll('users');
    if (existing.some((u) => u.role === 'manager' && u.isActive)) {
      return { success: false, message: 'مدیر سیستم قبلاً ایجاد شده است.' };
    }

    const now = TimeService.now();
    const userId = `usr-mgr-${now}`;
    const normalized = normalizeUsername(data.username);
    const newUser: User = {
      id: userId,
      username: normalized,
      fullName: data.fullName.trim(),
      role: 'manager',
      department: data.department ? data.department.trim() : 'مدیریت فنی و مهندسی',
      isActive: true,
      updatedAt: now,
    };
    const pHash = await hashPassword(data.password);
    await db.put('users', newUser);
    await db.put('userCredentials', {
      userId,
      usernameNormalized: normalized,
      passwordHash: pHash,
      updatedAt: now,
    });
    return { success: true, message: 'مدیر ارشد با موفقیت ثبت شد.', user: newUser };
  }
}
