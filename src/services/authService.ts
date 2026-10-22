import { getDB } from './db';
import type { User, AuthSession, Role, UserCredential, SessionRecord } from '../types';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  normalizeUsername,
  validatePasswordStrength,
  validateUsernameFormat,
} from '../utils/crypto';
import { TimeService } from '../utils/timeService';
import { DEFAULT_APPS_SCRIPT_URL } from '../config/constants';

const SESSION_STORAGE_KEY = 'timar_auth_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class AuthService {
  private static activeSession: AuthSession | null = null;
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
   * Loads persisted session from localStorage, verifies cryptographic tokens in IndexedDB,
   * and authoritatively validates with the backend when online.
   */
  public static async init(scriptUrl?: string): Promise<User | null> {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) {
        this.activeSession = null;
        this.notify(null);
        return null;
      }

      const parsed: AuthSession = JSON.parse(stored);
      if (!parsed || !parsed.token || !parsed.user) {
        this.clearSession();
        return null;
      }

      const now = TimeService.now();
      if (parsed.expiresAt && parsed.expiresAt < now) {
        this.clearSession();
        return null;
      }

      // Verify that local cryptographic session record exists and has not been revoked
      const db = await getDB();
      const tHash = await hashToken(parsed.token);
      const sessionRecord = await db.getFromIndex('sessions', 'by-tokenHash', tHash);
      if (!sessionRecord || sessionRecord.isRevoked || sessionRecord.expiresAt < now) {
        this.clearSession();
        return null;
      }

      // Verify user exists and is active locally
      const localUser = await db.get('users', parsed.user.id);
      if (!localUser || !localUser.isActive) {
        this.clearSession();
        return null;
      }

      this.activeSession = {
        ...parsed,
        user: localUser,
      };

      // Determine backend endpoint
      const endpoint = scriptUrl || (await this.getConfiguredScriptUrl());

      // If online and backend is configured, authoritatively validate session with server
      if (endpoint && typeof navigator !== 'undefined' && navigator.onLine) {
        const serverCheck = await this.validateServerSession(endpoint);
        if (!serverCheck.isValid) {
          this.clearSession();
          return null;
        }
        if (serverCheck.user) {
          this.activeSession.user = serverCheck.user;
          this.notify(serverCheck.user);
          return serverCheck.user;
        }
      }

      this.notify(this.activeSession.user);
      return this.activeSession.user;
    } catch {
      this.clearSession();
      return null;
    }
  }

  public static getSession(): AuthSession | null {
    if (!this.activeSession) return null;
    if (this.activeSession.expiresAt < TimeService.now()) {
      this.clearSession();
      return null;
    }
    return this.activeSession;
  }

  public static getCurrentUser(): User | null {
    const session = this.getSession();
    return session ? session.user : null;
  }

  public static getSessionToken(): string | null {
    const session = this.getSession();
    return session ? session.token : null;
  }

  /** Only server-issued tokens may authorize cloud API calls. */
  public static getServerSessionToken(): string | null {
    const session = this.getSession();
    return session?.serverAuthenticated === true ? session.token : null;
  }

  /**
   * Validates active session against server when online.
   * If server rejects or token is revoked, session is invalidated.
   */
  public static async validateServerSession(scriptUrl: string): Promise<{ isValid: boolean; user?: User }> {
    const session = this.getSession();
    if (!session) return { isValid: false };

    if (!scriptUrl || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      // Offline fallback: validate local cryptographic session record and expiration
      const db = await getDB();
      const tHash = await hashToken(session.token);
      const record = await db.getFromIndex('sessions', 'by-tokenHash', tHash);
      if (!record || record.isRevoked || record.expiresAt < TimeService.now()) {
        return { isValid: false };
      }
      return { isValid: true, user: session.user };
    }

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'validateSession',
          sessionToken: session.token,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await this.logout(scriptUrl);
          return { isValid: false };
        }
        // A transient server error may allow local work, but it never upgrades a local token.
        return { isValid: true, user: session.user };
      }

      const result = await response.json();
      if (result.success && result.user) {
        // Refresh authoritative user from server
        this.activeSession = {
          ...session,
          user: result.user,
          serverAuthenticated: true,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.activeSession));
        const db = await getDB();
        await db.put('users', result.user);
        this.notify(result.user);
        return { isValid: true, user: result.user };
      } else {
        // Explicit rejection or revoked session on server
        await this.logout(scriptUrl);
        return { isValid: false };
      }
    } catch {
      // Offline / transient network error: fallback to local cryptographic token record
      return { isValid: true, user: session.user };
    }
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

            // Never fabricate a cloud token: only the server can issue a token it will accept.
            if (typeof result.sessionToken !== 'string' || !/^[a-f0-9]{64}$/i.test(result.sessionToken) ||
                typeof result.expiresAt !== 'number' || !Number.isFinite(result.expiresAt) || result.expiresAt <= TimeService.now()) {
              return { success: false, message: 'پاسخ احراز هویت سرور فاقد نشست معتبر است. کد Apps Script را به‌روزرسانی و دوباره منتشر کنید.' };
            }
            const token = result.sessionToken;
            const now = TimeService.now();
            const expiresAt = result.expiresAt;

            // Cache salted PBKDF2 hash of this valid password locally for seamless offline login
            const pHash = await hashPassword(password);
            await db.put('userCredentials', {
              userId: result.user.id,
              usernameNormalized: username,
              passwordHash: pHash,
              updatedAt: now,
            });

            // Record cryptographic session in local sessions store
            const tHash = await hashToken(token);
            await db.put('sessions', {
              id: `sess-${now}-${Math.random().toString(36).substring(2, 6)}`,
              tokenHash: tHash,
              userId: result.user.id,
              username: result.user.username,
              role: result.user.role,
              createdAt: now,
              expiresAt,
              isRevoked: false,
            });

            const session: AuthSession = {
              token,
              user: result.user,
              expiresAt,
              createdAt: now,
              serverAuthenticated: true,
            };

            this.activeSession = session;
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
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

    const token = generateSecureToken();
    const tHash = await hashToken(token);
    const now = TimeService.now();
    const expiresAt = now + SESSION_DURATION_MS;

    const sessionRecord: SessionRecord = {
      id: `sess-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tokenHash: tHash,
      userId: user.id,
      username: user.username,
      role: user.role,
      createdAt: now,
      expiresAt,
      isRevoked: false,
    };
    await db.put('sessions', sessionRecord);

    const session: AuthSession = {
      token,
      user,
      expiresAt,
      createdAt: now,
      serverAuthenticated: false,
    };

    this.activeSession = session;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.notify(user);

    return { success: true, user };
  }

  /**
   * Logs out the current session and revokes tokens.
   */
  public static async logout(scriptUrl?: string): Promise<void> {
    const session = this.activeSession;
    if (session && scriptUrl && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'logout',
            sessionToken: session.token,
          }),
        });
      } catch {
        // Best effort
      }
    }

    if (session) {
      try {
        const db = await getDB();
        const tHash = await hashToken(session.token);
        const record = await db.getFromIndex('sessions', 'by-tokenHash', tHash);
        if (record) {
          record.isRevoked = true;
          await db.put('sessions', record);
        }
      } catch {
        // Fallback
      }
    }

    this.clearSession();
  }

  private static clearSession(): void {
    this.activeSession = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
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
    const token = this.getSessionToken();
    if (scriptUrl && scriptUrl.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine && !this.getServerSessionToken()) {
      return { success: false, message: 'برای تغییر حساب‌های کاربری باید با نشست معتبر صادرشده از سرور وارد شوید.' };
    }
    if (scriptUrl && scriptUrl.startsWith('http') && token && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'createUser',
            sessionToken: token,
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

    const token = this.getSessionToken();
    if (scriptUrl && scriptUrl.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine && !this.getServerSessionToken()) {
      return { success: false, message: 'برای تغییر حساب‌های کاربری باید با نشست معتبر صادرشده از سرور وارد شوید.' };
    }
    if (scriptUrl && scriptUrl.startsWith('http') && token && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'resetPassword',
            sessionToken: token,
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

    // Revoke all existing sessions for this user
    const sessions = await db.getAllFromIndex('sessions', 'by-user', targetUserId);
    for (const s of sessions) {
      s.isRevoked = true;
      await db.put('sessions', s);
    }

    return { success: true, message: 'رمز عبور با موفقیت به‌روزرسانی شد و نشست‌های قبلی کاربر باطل گردید.' };
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

    const token = this.getSessionToken();
    if (scriptUrl && scriptUrl.startsWith('http') && typeof navigator !== 'undefined' && navigator.onLine && !this.getServerSessionToken()) {
      return { success: false, message: 'برای تغییر حساب‌های کاربری باید با نشست معتبر صادرشده از سرور وارد شوید.' };
    }
    if (scriptUrl && scriptUrl.startsWith('http') && token && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateUser',
            sessionToken: token,
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

    // If account was deactivated, revoke all their sessions
    if (updates.isActive === false) {
      const sessions = await db.getAllFromIndex('sessions', 'by-user', targetUserId);
      for (const s of sessions) {
        s.isRevoked = true;
        await db.put('sessions', s);
      }
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
