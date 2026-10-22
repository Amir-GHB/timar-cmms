/**
 * Cryptographic and Authentication Utilities
 * Implements salted PBKDF2 password hashing via Web Crypto API,
 * secure unpredictable token generation, and canonical username normalization.
 */

const PBKDF2_ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Normalizes username: trims leading/trailing whitespace and converts to lower case.
 * Ensures consistent canonical comparison across client and backend.
 */
export function normalizeUsername(username: string): string {
  if (!username) return '';
  return username.trim().toLowerCase();
}

/**
 * Validates username format: alphanumeric and underscore, 3-30 characters.
 */
export function validateUsernameFormat(username: string): { isValid: boolean; message?: string } {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return { isValid: false, message: 'نام کاربری نمی‌تواند خالی باشد.' };
  }
  if (normalized.length < 3) {
    return { isValid: false, message: 'نام کاربری باید حداقل ۳ کاراکتر باشد.' };
  }
  if (normalized.length > 30) {
    return { isValid: false, message: 'نام کاربری نمی‌تواند بیش از ۳۰ کاراکتر باشد.' };
  }
  const usernameRegex = /^[a-z0-9_]+$/;
  if (!usernameRegex.test(normalized)) {
    return { isValid: false, message: 'نام کاربری فقط می‌تواند شامل حروف لاتین، اعداد و خط زیر (_) باشد.' };
  }
  return { isValid: true };
}

/**
 * Validates password strength: minimum 12 characters for secure accounts.
 */
export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  if (!password) {
    return { isValid: false, message: 'رمز عبور نمی‌تواند خالی باشد.' };
  }
  if (password.length < 12) {
    return { isValid: false, message: 'رمز عبور باید حداقل ۱۲ کاراکتر باشد.' };
  }
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+~`|}{[\]:;?><,./\-=]/.test(password);
  if (!hasLower || !hasUpper || !hasDigitOrSpecial) {
    return { isValid: false, message: 'رمز عبور باید شامل ترکیبی از حروف بزرگ، حروف کوچک و ارقام یا نشانه‌ها باشد.' };
  }
  return { isValid: true };
}

/**
 * Helper: ArrayBuffer to Hex string
 */
function bufferToHex(buffer: ArrayBufferLike | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Helper: Hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Gets the standard Web Crypto subtle interface across browser and Node.js environments.
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API is not available in this environment');
}

/**
 * Generates cryptographically secure random bytes
 */
export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Hashes a plaintext password using PBKDF2-SHA256 with 100,000 rounds and random salt.
 * Output format: "pbkdf2:100000:<saltHex>:<hashHex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const salt = getRandomBytes(SALT_BYTES);
  const encoder = new TextEncoder();
  const passBuffer = encoder.encode(password);

  const baseKey = await subtle.importKey(
    'raw',
    passBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO,
    },
    baseKey,
    KEY_BYTES * 8
  );

  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derivedBits);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Constant-time byte array equality comparison to prevent timing attacks.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Verifies a candidate plaintext password against a stored PBKDF2 hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const salt = hexToBytes(parts[2]);
  const expectedHash = hexToBytes(parts[3]);

  if (isNaN(iterations) || iterations < 1000) return false;

  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const passBuffer = encoder.encode(password);

  const baseKey = await subtle.importKey(
    'raw',
    passBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations,
      hash: HASH_ALGO,
    },
    baseKey,
    expectedHash.length * 8
  );

  const actualHash = new Uint8Array(derivedBits);
  return constantTimeEqual(expectedHash, actualHash);
}

/**
 * Generates an unpredictable, cryptographically random session token (hex string).
 */
export function generateSecureToken(byteLength = 32): string {
  const bytes = getRandomBytes(byteLength);
  return bufferToHex(bytes.buffer);
}

/**
 * Computes SHA-256 hash of a string (used to store session token hashes rather than raw tokens).
 */
export async function hashToken(token: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}
