import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
} from 'lucide-react';
import {
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEK_DAYS,
  toPersianDigits,
  getJalaliMonthDays,
  getJalaliFirstDayOfWeek,
  isoToJalali,
  jalaliToIso,
  getTodayJalali,
  formatPersianDate,
} from '../../utils/persianDate';

interface PersianDatePickerProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (isoDate: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ شمسی...',
  required = false,
  disabled = false,
  readOnly = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Jalali view state from current value or today
  const [todayYear, todayMonth, todayDay] = getTodayJalali();
  const initialJalali = value ? isoToJalali(value) : null;

  const [viewYear, setViewYear] = useState<number>(initialJalali ? initialJalali[0] : todayYear);
  const [viewMonth, setViewMonth] = useState<number>(initialJalali ? initialJalali[1] : todayMonth);

  // Synchronize view when value changes from outside
  useEffect(() => {
    if (value) {
      const j = isoToJalali(value);
      if (j) {
        setViewYear(j[0]);
        setViewMonth(j[1]);
      }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const totalDays = getJalaliMonthDays(viewYear, viewMonth);
  const firstDayOfWeek = getJalaliFirstDayOfWeek(viewYear, viewMonth); // 0 = Sat, ..., 6 = Fri

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const isoStr = jalaliToIso(viewYear, viewMonth, day);
    onChange(isoStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    const isoStr = jalaliToIso(todayYear, todayMonth, todayDay);
    onChange(isoStr);
    setIsOpen(false);
  };

  // Determine selected day in currently viewed month
  const currentSelectedJalali = value ? isoToJalali(value) : null;
  const isSelectedInView =
    currentSelectedJalali &&
    currentSelectedJalali[0] === viewYear &&
    currentSelectedJalali[1] === viewMonth;
  const selectedDay = isSelectedInView ? currentSelectedJalali[2] : null;

  const displayFormatted = value ? formatPersianDate(value) : '';

  return (
    <div className={`relative ${className}`} ref={containerRef} dir="rtl">
      {label && (
        <label className="block font-bold text-slate-700 text-xs mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input Trigger Button */}
      <button
        type="button"
        disabled={disabled || readOnly}
        onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white border rounded-lg text-xs flex items-center justify-between gap-2 transition-all cursor-pointer font-vazir ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-sky-500 ring-2 ring-sky-100 text-slate-900'
            : 'border-slate-300 hover:border-slate-400 text-slate-800'
        }`}
      >
        <span className="flex items-center gap-2 font-mono">
          <CalendarIcon className="w-4 h-4 text-sky-600 shrink-0" />
          {displayFormatted ? (
            <span className="font-bold text-slate-900 text-xs">{displayFormatted}</span>
          ) : (
            <span className="text-slate-400 font-sans">{placeholder}</span>
          )}
        </span>

        {displayFormatted && !disabled && !readOnly && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            title="پاک کردن تاریخ"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Persian Jalali Calendar Popover */}
      {isOpen && (
        <div
          className="absolute z-50 top-full mt-1 right-0 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span>{PERSIAN_MONTH_NAMES[viewMonth - 1]}</span>
              <span className="font-mono text-sky-700">{toPersianDigits(viewYear)}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="ماه قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="ماه بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {PERSIAN_WEEK_DAYS.map((wd, i) => (
              <div
                key={i}
                className={`text-[11px] font-semibold py-1 ${
                  i === 6 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading cells before the 1st day of the month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Day buttons */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isSelected = selectedDay === day;
              const isToday =
                todayYear === viewYear &&
                todayMonth === viewMonth &&
                todayDay === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 sm:h-9 rounded-lg font-mono text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : isToday
                      ? 'bg-sky-50 text-sky-800 font-bold border border-sky-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {/* Popover Footer: Today shortcut & clear */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-sky-700 hover:text-sky-800 font-bold px-2 py-1 rounded hover:bg-sky-50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>امروز ({toPersianDigits(todayDay)} {PERSIAN_MONTH_NAMES[todayMonth - 1]})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
