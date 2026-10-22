# Timar CMMS: Security Refactor, Persian Login, Mobile UI Fix, and Reports PDF Export

Completed implementation of all security, session management, user authorization, reporting date presets, custom PDF export, and mobile UI requirements across frontend and Google Apps Script (`Code.gs`) backend.

## 1. Authentication and Session Security
- **Eliminated All Login Bypasses**: Completely removed hardcoded universal bypasses (`admin123`, `tech123`), the quick profile selector, automatic login as the first user or manager, and trusting `settings.currentUser` or IndexedDB as proof of authentication.
- **Removed Fast Account Switching**: Account switching now requires an explicit logout followed by credential-based authentication.
- **Cryptographic Hashing & Salted Storage**:
  - Implemented Web Crypto PBKDF2-SHA256 password hashing with 100,000 iterations and random salt (`src/utils/crypto.ts`).
  - Added safe migration for legacy credentials into an isolated `userCredentials` store.
  - Initialized default secure credentials (`manager` / `Admin#2026@Timar`, `tech1` & `tech2` / `Tech#2026@Timar`).
- **Cryptographic Sessions**:
  - Unpredictable 256-bit random session tokens generated via `crypto.getRandomValues`.
  - Sessions stored only as SHA-256 token hashes server-side and in IndexedDB `sessions` store with creation time, expiration time, and revocation flags.
  - Server validation on protected requests with automatic invalidation upon logout or password reset.
  - Stripped credentials and password hashes from synchronization payloads and API responses.

## 2. Backend Authorization and Data Integrity
- **Server-Authoritative Apps Script Engine (`Code.gs`)**:
  - Centralized role verification deriving acting user and role strictly from the server session token (`Sessions` sheet).
  - Protected `syncPush` and `syncFull` against identity forgery and privilege escalation.
  - Technicians are restricted from mutating users, creating/deleting PM schedules, or tampering with security logs.
  - Concurrency controls via `LockService` for atomic user creation and unique username reservation.

## 3. Manager-Only User Management
- **User Management Panel (`UserManagementPanel.tsx`)**:
  - Integrated into the Settings view, restricted strictly to active Managers.
  - Create user form with full name, canonical Latin username, role selection, department, and complex password confirmation (minimum 12 characters).
  - Reset password tool that revokes all active sessions for the target user.
  - Active status toggle with a hard safeguard preventing deactivation or demotion of the last active manager.

## 4. Persian RTL Login UI
- **Persian Login Modal (`LoginModal.tsx`)**:
  - Fully bilingual with RTL Persian layout.
  - Latin LTR formatting for username and password fields.
  - Password visibility toggle (Eye/EyeOff).
  - Generic Persian error messages without exposing whether the username or password was incorrect.
  - Unauthenticated mandatory gate preventing access to protected plant operations when logged out.

## 5. Mobile UI Fix
- **Offline Indicator (`OfflineIndicator.tsx`)**:
  - Repositioned notification to `bottom-[68px] md:bottom-4 left-4 z-40` above the mobile bottom navigation bar (`bottom-0 z-40 h-[~56px]`), eliminating tap interception.
  - Fully localized in Persian with live pending mutation counters.

## 6. Reports Date Presets & Real PDF Export
- **Exact Four Presets in Reports (`ReportsSectionView.tsx`)**:
  1. **Current Week (`هفته جاری`)**: From Saturday of the current week through today (`todayIso`).
  2. **Current Month (`ماه جاری`)**: From 1st day of the current Jalali month through today (`todayIso`).
  3. **Last 6 Months (`۶ ماه گذشته`)**: From the same calendar day six Persian months ago through today (`todayIso`), with proper month length clamping (e.g. 31 Farvardin -> 30 Mehr) and year rollover.
  4. **Current Year (`سال جاری`)**: From 1 Farvardin of the current Persian year through today (`todayIso`).
  - Added filter reset button (`حذف فیلتر`).
- **Custom PDF Generator (`pdfGenerator.ts`)**:
  - Replaced `window.print()` with real PDF file generation and download using `jspdf` and `html2canvas`.
  - Features Persian RTL styling, plant branding, KPI cards, and structured work order tables.

## 7. Verification & Automated Test Suite
- Created `scripts/run-security-tests.ts` with 29 automated tests covering PBKDF2 salting, universal bypass rejection, session token entropy, username canonicalization, password complexity, Jalali 6-month & leap year calculations, and manager protection rules.
- Test suite executed via `npm test` with 100% pass rate (29/29).
- `tsc --noEmit` and `compile_applet` validated with zero errors.
