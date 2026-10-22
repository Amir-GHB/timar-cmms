/**
 * Application Constants and Default Backend Configuration
 */

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyMzyX0EpK9ve6UvdJNft8tVf3NYiHW5s_K_jIMzxMOm5SOU189kcODcjd6ofOi5XBjkg/exec';

/**
 * Validates whether a given string is a valid Google Apps Script Web App endpoint.
 */
export function isValidAppsScriptUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      parsed.pathname.includes('/macros/s/') &&
      parsed.pathname.endsWith('/exec')
    );
  } catch {
    return false;
  }
}

/**
 * Returns a user-friendly Persian error message if the URL is invalid.
 */
export function getUrlValidationError(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'آدرس وب‌اپلیکیشن گوگل وارد نشده است.';
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) {
    return 'آدرس سرور باید با پروتکل امن https:// آغاز شود.';
  }
  if (!trimmed.includes('script.google.com')) {
    return 'آدرس سرور باید مربوط به دامنه معتبر script.google.com باشد.';
  }
  if (!trimmed.endsWith('/exec')) {
    return 'آدرس سرور وب‌اپلیکیشن باید با پسوند /exec به پایان برسد.';
  }
  return null;
}
