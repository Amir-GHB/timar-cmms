/**
 * Comprehensive Persian (Jalali / Solar Hijri) date utility.
 * Replicates QCalendar::System::Jalali and persiandigits.cpp from Timar Qt.
 */

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PERSIAN_WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const PERSIAN_WEEK_DAYS_FULL = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export function toPersianDigits(text: string | number): string {
  if (text === undefined || text === null) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return text.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

export function fromPersianDigits(text: string): string {
  if (!text) return '';
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function isJalaliLeapYear(jy: number): boolean {
  return (((jy - (jy > 0 ? 474 : 473)) % 2820 + 474 + 38) * 682) % 2816 < 682;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

/**
 * Returns weekday index for the 1st day of a Jalali month:
 * 0: شنبه (Saturday), 1: یکشنبه (Sunday), ..., 6: جمعه (Friday)
 */
export function getJalaliFirstDayOfWeek(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const date = new Date(gy, gm - 1, gd);
  return (date.getDay() + 1) % 7;
}

export function parseIsoDateParts(dateStr: string): [number, number, number] | null {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return [y, m, d];
}

export function isoToJalali(isoStr: string): [number, number, number] | null {
  const parts = parseIsoDateParts(isoStr);
  if (!parts) return null;
  return gregorianToJalali(parts[0], parts[1], parts[2]);
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const mm = gm < 10 ? `0${gm}` : `${gm}`;
  const dd = gd < 10 ? `0${gd}` : `${gd}`;
  return `${gy}-${mm}-${dd}`;
}

export function formatPersianDate(
  dateInput: string | number | Date,
  options?: { showMonthName?: boolean; separator?: string }
): string {
  if (!dateInput) return '-';
  try {
    let gy: number, gm: number, gd: number;
    if (typeof dateInput === 'number') {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '-';
      gy = d.getFullYear();
      gm = d.getMonth() + 1;
      gd = d.getDate();
    } else if (typeof dateInput === 'string') {
      const parts = parseIsoDateParts(dateInput);
      if (parts) {
        [gy, gm, gd] = parts;
      } else {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        gy = d.getFullYear();
        gm = d.getMonth() + 1;
        gd = d.getDate();
      }
    } else {
      gy = dateInput.getFullYear();
      gm = dateInput.getMonth() + 1;
      gd = dateInput.getDate();
    }

    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);

    if (options?.showMonthName) {
      const monthName = PERSIAN_MONTH_NAMES[jm - 1];
      return `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
    }

    const sep = options?.separator || '/';
    const mm = jm < 10 ? `0${jm}` : `${jm}`;
    const dd = jd < 10 ? `0${jd}` : `${jd}`;
    return toPersianDigits(`${jy}${sep}${mm}${sep}${dd}`);
  } catch {
    return String(dateInput);
  }
}

export function getTodayJalali(): [number, number, number] {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function getTodayIso(): string {
  const [jy, jm, jd] = getTodayJalali();
  return jalaliToIso(jy, jm, jd);
}

export function formatDualDate(
  dateInput: string | Date,
  calendarType: 'gregorian' | 'persian' = 'persian',
  language: 'en' | 'fa' = 'fa'
): string {
  if (!dateInput) return '-';
  if (calendarType === 'persian') {
    return formatPersianDate(dateInput, { showMonthName: true });
  }
  try {
    if (typeof dateInput === 'string') {
      return dateInput.split('T')[0];
    }
    return dateInput.toISOString().split('T')[0];
  } catch {
    return String(dateInput);
  }
}

/**
 * Report Date Presets (strictly based on Persian Jalali calendar):
 * - current_week: From Saturday of the current week through today
 * - current_month: From 1st of the current Jalali month through today
 * - last_6_months: From 6 Jalali months before today through today
 * - last_year: From 1 Jalali year before today through today
 */
export function getReportPresetRanges(): {
  currentWeek: { startIso: string; endIso: string };
  currentMonth: { startIso: string; endIso: string };
  last6Months: { startIso: string; endIso: string };
  lastYear: { startIso: string; endIso: string };
} {
  const [jy, jm, jd] = getTodayJalali();
  const todayIso = jalaliToIso(jy, jm, jd);

  // Current Week: from Saturday through today
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const jsDate = new Date(gy, gm - 1, gd);
  const jalaliDayOfWeek = (jsDate.getDay() + 1) % 7; // 0 = Sat, 1 = Sun, ..., 6 = Fri
  const satJsDate = new Date(gy, gm - 1, gd - jalaliDayOfWeek);
  const startWeekIso = `${satJsDate.getFullYear()}-${String(satJsDate.getMonth() + 1).padStart(2, '0')}-${String(satJsDate.getDate()).padStart(2, '0')}`;

  // Current Month: from day 1 through today
  const startMonthIso = jalaliToIso(jy, jm, 1);

  // Last 6 Months
  let m6Year = jy;
  let m6Month = jm - 6;
  if (m6Month <= 0) {
    m6Year -= 1;
    m6Month += 12;
  }
  const maxDay6 = getJalaliMonthDays(m6Year, m6Month);
  const start6MonthsIso = jalaliToIso(m6Year, m6Month, Math.min(jd, maxDay6));

  // Last Year
  const maxDayYear = getJalaliMonthDays(jy - 1, jm);
  const startYearIso = jalaliToIso(jy - 1, jm, Math.min(jd, maxDayYear));

  return {
    currentWeek: { startIso: startWeekIso, endIso: todayIso },
    currentMonth: { startIso: startMonthIso, endIso: todayIso },
    last6Months: { startIso: start6MonthsIso, endIso: todayIso },
    lastYear: { startIso: startYearIso, endIso: todayIso },
  };
}
