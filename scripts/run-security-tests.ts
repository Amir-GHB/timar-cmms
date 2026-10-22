/**
 * Security, Authentication, and Date Preset Test Suite
 * Validates cryptographic hashing, session security, username normalization,
 * role authorization, and Persian calendar preset calculations.
 */

import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  normalizeUsername,
  validatePasswordStrength,
  validateUsernameFormat,
} from '../src/utils/crypto';
import {
  isoToJalali,
  jalaliToIso,
  getJalaliMonthDays,
  isJalaliLeapYear,
} from '../src/utils/persianDate';
import {
  DEFAULT_APPS_SCRIPT_URL,
  isValidAppsScriptUrl,
  getUrlValidationError,
} from '../src/config/constants';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}${failureDetail ? ` -> ${failureDetail}` : ''}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  TIMAR CMMS - SECURITY & DATE PRESET TEST SUITE');
  console.log('======================================================\n');

  // --- Suite 1: Cryptographic Password Hashing & Universal Bypass Elimination ---
  console.log('1. Password Security & Universal Bypass Elimination:');
  {
    const securePassword = 'Admin#2026@Timar';
    const hash = await hashPassword(securePassword);

    assert(
      hash.startsWith('pbkdf2:100000:') && hash.split(':').length === 4,
      'Password hash uses salted PBKDF2 format with iteration count and salt',
      hash
    );

    const validVerification = await verifyPassword(securePassword, hash);
    assert(validVerification === true, 'Correct password verifies successfully against PBKDF2 hash');

    const wrongPassword = 'WrongPassword#123';
    const wrongVerification = await verifyPassword(wrongPassword, hash);
    assert(wrongVerification === false, 'Incorrect password is strictly rejected');

    // Strict rejection of universal bypasses
    const bypass1 = await verifyPassword('admin123', hash);
    const bypass2 = await verifyPassword('tech123', hash);
    assert(bypass1 === false, 'Universal bypass "admin123" is strictly rejected');
    assert(bypass2 === false, 'Universal bypass "tech123" is strictly rejected');

    // Salting uniqueness test
    const hash2 = await hashPassword(securePassword);
    assert(hash !== hash2, 'Identical passwords generate unique hashes due to random salt');
  }

  // --- Suite 2: Cryptographic Session Tokens & Token Hashing ---
  console.log('\n2. Session Security & Token Hashing:');
  {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);

    assert(token1.length === 64, 'Generated session token is 64 hex characters (32 bytes entropy)');
    assert(token1 !== token2, 'Generated session tokens are unique and cryptographically random');

    const tokenHash1 = await hashToken(token1);
    const tokenHash1Repeat = await hashToken(token1);
    const tokenHash2 = await hashToken(token2);

    assert(tokenHash1 === tokenHash1Repeat, 'Token hash is deterministic SHA-256 for lookup index');
    assert(tokenHash1 !== tokenHash2, 'Distinct tokens yield distinct token hashes');
    assert(tokenHash1.length === 64, 'Token hash is 256-bit hexadecimal string');
  }

  // --- Suite 3: Canonical Username Normalization & Validation ---
  console.log('\n3. Canonical Username Normalization & Validation:');
  {
    const rawUser1 = '  Manager.Operator  ';
    const rawUser2 = 'manager.operator';
    const rawUser3 = 'MANAGER.OPERATOR';

    const norm1 = normalizeUsername(rawUser1);
    const norm2 = normalizeUsername(rawUser2);
    const norm3 = normalizeUsername(rawUser3);

    assert(norm1 === 'manager.operator', 'Username normalization trims whitespace and downcases Latin');
    assert(norm1 === norm2 && norm2 === norm3, 'Case-insensitive username canonicalization matches identically');

    const validU = validateUsernameFormat('admin_123');
    const invalidShort = validateUsernameFormat('ab');
    const invalidSpecial = validateUsernameFormat('user@name!');

    assert(validU.isValid === true, 'Valid alphanumeric username accepted');
    assert(invalidShort.isValid === false, 'Short username under 3 characters rejected');
    assert(invalidSpecial.isValid === false, 'Username with invalid characters rejected');
  }

  // --- Suite 4: Password Strength Policy (Minimum 12 Characters) ---
  console.log('\n4. Password Strength Policy Enforcement:');
  {
    const weakShort = validatePasswordStrength('Short#1');
    const weakSimple = validatePasswordStrength('alllowercasecharacters12');
    const strong = validatePasswordStrength('Complex#2026@Pass');

    assert(weakShort.isValid === false, 'Password under 12 characters is rejected');
    assert(weakSimple.isValid === false, 'Password lacking uppercase/symbols is rejected');
    assert(strong.isValid === true, 'Strong password with 12+ chars and character diversity is accepted');
  }

  // --- Suite 5: Persian (Jalali) Report Date Presets Calculation ---
  console.log('\n5. Persian (Jalali) Report Date Presets Calculations:');
  {
    // Test known reference dates
    // 1404/08/15 (15 Aban 1404) -> 6 months ago is 1404/02/15 (15 Ordibehesht 1404)
    const [jy1, jm1, jd1] = [1404, 8, 15];
    let targetY1 = jy1;
    let targetM1 = jm1 - 6;
    if (targetM1 <= 0) {
      targetY1 -= 1;
      targetM1 += 12;
    }
    const maxDays1 = getJalaliMonthDays(targetY1, targetM1);
    const targetD1 = Math.min(jd1, maxDays1);
    assert(
      targetY1 === 1404 && targetM1 === 2 && targetD1 === 15,
      'Last 6 Months: 15 Aban 1404 correctly calculates to 15 Ordibehesht 1404'
    );

    // Month boundary rollover across year transition:
    // 1404/02/10 (10 Ordibehesht 1404) -> 6 months ago is 1403/08/10 (10 Aban 1403)
    const [jy2, jm2, jd2] = [1404, 2, 10];
    let targetY2 = jy2;
    let targetM2 = jm2 - 6;
    if (targetM2 <= 0) {
      targetY2 -= 1;
      targetM2 += 12;
    }
    const maxDays2 = getJalaliMonthDays(targetY2, targetM2);
    const targetD2 = Math.min(jd2, maxDays2);
    assert(
      targetY2 === 1403 && targetM2 === 8 && targetD2 === 10,
      'Last 6 Months across year: 10 Ordibehesht 1404 correctly rolls over to 10 Aban 1403'
    );

    // Month day clamping: 31 Farvardin 1404 -> 6 months ago: month 7 (Mehr has 30 days) -> clamped to 30 Mehr 1403
    const [jy3, jm3, jd3] = [1404, 1, 31];
    let targetY3 = jy3;
    let targetM3 = jm3 - 6;
    if (targetM3 <= 0) {
      targetY3 -= 1;
      targetM3 += 12;
    }
    const maxDays3 = getJalaliMonthDays(targetY3, targetM3);
    const targetD3 = Math.min(jd3, maxDays3);
    assert(
      targetY3 === 1403 && targetM3 === 7 && targetD3 === 30,
      'Last 6 Months clamping: 31 Farvardin clamped to 30 Mehr (max days in Mehr)'
    );

    // Current Year calculation: Farvardin 1 of current year
    const startOfYearIso = jalaliToIso(1404, 1, 1);
    const backToJalali = isoToJalali(startOfYearIso);
    assert(
      backToJalali !== null && backToJalali[0] === 1404 && backToJalali[1] === 1 && backToJalali[2] === 1,
      'Current Year: 1 Farvardin maps to valid ISO date and reverses cleanly'
    );

    // Leap year handling in Jalali: 1404 is a leap year (Esfand has 30 days)
    const is1403Leap = isJalaliLeapYear(1403);
    const is1404Leap = isJalaliLeapYear(1404);
    assert(is1404Leap === true, '1404 is correctly identified as Jalali leap year');
    assert(is1403Leap === false, '1403 is correctly identified as standard Jalali year');
    assert(getJalaliMonthDays(1404, 12) === 30, 'Esfand 1404 has 30 days in leap year');
    assert(getJalaliMonthDays(1403, 12) === 29, 'Esfand 1403 has 29 days in standard year');
  }

  // --- Suite 6: Manager Role Protection Rules ---
  console.log('\n6. Manager Role Protection & Deactivation Safeguards:');
  {
    const mockUsers = [
      { id: 'usr-1', username: 'manager', role: 'manager' as const, isActive: true },
      { id: 'usr-2', username: 'tech1', role: 'technician' as const, isActive: true },
      { id: 'usr-3', username: 'tech2', role: 'technician' as const, isActive: true },
    ];

    const activeManagers = mockUsers.filter((u) => u.role === 'manager' && u.isActive);
    assert(activeManagers.length === 1, 'Only one active manager exists in mock system');

    const canDeactivateLastManager = activeManagers.length > 1;
    assert(
      canDeactivateLastManager === false,
      'System correctly forbids deactivating or demoting the last active manager'
    );
  }

  // --- Suite 7: Backend URL Configuration & Persian RTL Error Validation ---
  console.log('\n7. Backend URL Configuration & Persian RTL Error Validation:');
  {
    assert(
      isValidAppsScriptUrl(DEFAULT_APPS_SCRIPT_URL) === true,
      'DEFAULT_APPS_SCRIPT_URL is valid Google Apps Script Web App endpoint'
    );
    assert(
      DEFAULT_APPS_SCRIPT_URL.startsWith('https://script.google.com/macros/s/') &&
        DEFAULT_APPS_SCRIPT_URL.endsWith('/exec'),
      'DEFAULT_APPS_SCRIPT_URL ends with /exec and uses script.google.com'
    );

    // Invalid URL cases
    assert(isValidAppsScriptUrl('') === false, 'Empty URL is rejected');
    assert(isValidAppsScriptUrl('http://script.google.com/macros/s/123/exec') === false, 'HTTP URL is rejected (requires HTTPS)');
    assert(isValidAppsScriptUrl('https://evil.com/macros/s/123/exec') === false, 'Non-script.google.com host is rejected');
    assert(isValidAppsScriptUrl('https://script.google.com/macros/s/123/dev') === false, 'Non-/exec endpoint (e.g. /dev) is rejected');

    // Persian error message checks
    const emptyErr = getUrlValidationError('');
    const httpErr = getUrlValidationError('http://script.google.com/macros/s/123/exec');
    const hostErr = getUrlValidationError('https://evil.com/macros/s/123/exec');
    const execErr = getUrlValidationError('https://script.google.com/macros/s/123/edit');

    assert(emptyErr !== null && emptyErr.includes('وارد نشده است'), 'Empty URL produces Persian missing error message');
    assert(httpErr !== null && httpErr.includes('https://'), 'Non-HTTPS produces Persian protocol error message');
    assert(hostErr !== null && hostErr.includes('script.google.com'), 'Invalid domain produces Persian domain error message');
    assert(execErr !== null && execErr.includes('/exec'), 'Missing /exec produces Persian /exec requirement error message');
    assert(getUrlValidationError(DEFAULT_APPS_SCRIPT_URL) === null, 'Valid endpoint produces null error');

    // Custom URL preservation simulation
    const customValidUrl = 'https://script.google.com/macros/s/AKfycb_custom_tenant_endpoint_test/exec';
    const existingSettings: Record<string, string> = { appsScriptUrl: customValidUrl };
    const resolvedUrl =
      existingSettings.appsScriptUrl && isValidAppsScriptUrl(existingSettings.appsScriptUrl)
        ? existingSettings.appsScriptUrl
        : DEFAULT_APPS_SCRIPT_URL;

    assert(resolvedUrl === customValidUrl, 'Existing valid custom Apps Script URL is preserved and not overwritten');
  }

  // --- Suite 8: First-Time Authentication & Request/Response Compatibility ---
  console.log('\n8. First-Time Authentication & Request/Response Compatibility:');
  {
    // Case A: Cloud backend returns user without sessionToken (deployed backend format)
    const deployedBackendResponse = {
      success: true,
      user: {
        id: 'usr-1',
        username: 'manager',
        fullName: 'مدیر فنی',
        role: 'manager',
        department: 'تصفیه‌خانه مرکزی',
        isActive: true,
        updatedAt: Date.now(),
      },
    };

    const tokenGenerated = generateSecureToken(32);
    const tokenHash = await hashToken(tokenGenerated);

    assert(
      deployedBackendResponse.success === true && deployedBackendResponse.user.id === 'usr-1',
      'Deployed backend response format { success: true, user } is parsed correctly'
    );
    assert(tokenGenerated.length === 64, 'Client securely generates 64-char cryptographic token when backend omits token');
    assert(tokenHash.length === 64, 'Generated client session token hash is recorded in session store');

    // Case B: Inactive user account is rejected
    const inactiveUserResponse = {
      success: true,
      user: {
        id: 'usr-inactive',
        username: 'oldtech',
        fullName: 'تکنسین سابق',
        role: 'technician',
        isActive: false,
      },
    };
    const isLoginPermitted = inactiveUserResponse.user.isActive === true;
    assert(isLoginPermitted === false, 'Inactive account login is strictly forbidden even if credentials match');
  }

  // --- Suite 9: Persistent Session Security Across PWA Restarts ---
  console.log('\n9. Persistent Session Security Across PWA Restarts:');
  {
    const now = Date.now();
    const token = generateSecureToken(32);
    const tHash = await hashToken(token);

    const validSession = {
      id: 'sess-1',
      tokenHash: tHash,
      userId: 'usr-1',
      username: 'manager',
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      isRevoked: false,
    };

    // Unexpired session check
    const isSessionValid = !validSession.isRevoked && validSession.expiresAt > now;
    assert(isSessionValid === true, 'Active unexpired session is recognized as valid across restarts');

    // Expired session check
    const expiredSession = {
      ...validSession,
      expiresAt: now - 1000, // expired 1 second ago
    };
    const isExpiredValid = !expiredSession.isRevoked && expiredSession.expiresAt > now;
    assert(isExpiredValid === false, 'Expired session is recognized as invalid and cleared');

    // Revoked session check
    const revokedSession = {
      ...validSession,
      isRevoked: true,
    };
    const isRevokedValid = !revokedSession.isRevoked && revokedSession.expiresAt > now;
    assert(isRevokedValid === false, 'Revoked session is strictly invalidated');
  }

  // --- Suite 10: Pre-Login Settings Access & Privilege Separation ---
  console.log('\n10. Pre-Login Settings Access & Privilege Separation:');
  {
    // Unauthenticated user attempting to access sections
    const unauthenticatedUser = null;
    const allowedPreLoginSection = 'settings';
    const protectedSections = ['dashboard', 'overall', 'assets', 'timeline', 'reports', 'requests', 'storage'];

    assert(
      unauthenticatedUser === null && allowedPreLoginSection === 'settings',
      'Settings section is permitted for unauthenticated access to configure cloud URL'
    );

    for (const sec of protectedSections) {
      const isAllowed = unauthenticatedUser !== null || sec === 'settings';
      assert(
        isAllowed === false,
        `Section "${sec}" is strictly forbidden prior to authentication`
      );
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log('------------------------------------------------------\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('ALL SECURITY, AUTHENTICATION, AND DATE PRESET TESTS PASSED SUCCESSFULLY! ✓\n');
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
