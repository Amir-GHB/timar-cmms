import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import {
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEK_DAYS,
  toPersianDigits,
  getJalaliMonthDays,
  getJalaliFirstDayOfWeek,
  jalaliToGregorian,
  gregorianToJalali,
  getTodayJalali,
} from '../../utils/persianDate';

export interface CalendarEventDot {
  date: string; // YYYY-MM-DD
  color: string; // hex or tailwind class
  title?: string;
}

interface PersianCalendarWidgetProps {
  eventDots?: CalendarEventDot[];
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate?: (dateStr: string) => void;
  className?: string;
}

export const PersianCalendarWidget: React.FC<PersianCalendarWidgetProps> = ({
  eventDots = [],
  selectedDate,
  onSelectDate,
  className = '',
}) => {
  const [todayYear, todayMonth, todayDay] = getTodayJalali();
  const [currentYear, setCurrentYear] = useState<number>(todayYear);
  const [currentMonth, setCurrentMonth] = useState<number>(todayMonth);

  const totalDays = getJalaliMonthDays(currentYear, currentMonth);
  const firstDayOfWeek = getJalaliFirstDayOfWeek(currentYear, currentMonth); // 0 = شنبه, ..., 6 = جمعه

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dayNumber: number) => {
    const [gy, gm, gd] = jalaliToGregorian(currentYear, currentMonth, dayNumber);
    const mmStr = gm < 10 ? `0${gm}` : `${gm}`;
    const ddStr = gd < 10 ? `0${gd}` : `${gd}`;
    const isoDate = `${gy}-${mmStr}-${ddStr}`;
    onSelectDate?.(isoDate);
  };

  // Convert eventDots into day map for current month
  const dotsByDay: Record<number, string[]> = {};
  for (const dot of eventDots) {
    if (!dot.date) continue;
    const parts = dot.date.split('-');
    if (parts.length === 3) {
      const gy = parseInt(parts[0], 10);
      const gm = parseInt(parts[1], 10);
      const gd = parseInt(parts[2], 10);
      const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
      if (jy === currentYear && jm === currentMonth) {
        if (!dotsByDay[jd]) dotsByDay[jd] = [];
        dotsByDay[jd].push(dot.color);
      }
    }
  }

  // Check selected day
  let selectedJalaliDay: number | null = null;
  if (selectedDate) {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const [jy, jm, jd] = gregorianToJalali(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10),
        parseInt(parts[2], 10)
      );
      if (jy === currentYear && jm === currentMonth) {
        selectedJalaliDay = jd;
      }
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 select-none ${className}`}
      dir="rtl"
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-800">
          <CalendarIcon className="w-4 h-4 text-sky-600" />
          <span className="font-bold text-sm">
            {PERSIAN_MONTH_NAMES[currentMonth - 1]} {toPersianDigits(currentYear)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="ماه قبل"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="ماه بعد"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers: ش، ی، د، س، چ، پ، ج */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {PERSIAN_WEEK_DAYS.map((wd, i) => (
          <div
            key={i}
            className={`text-xs font-semibold py-1 ${
              i === 6 ? 'text-rose-500' : 'text-slate-400'
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Leading empty cells for month start offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {/* Days 1..totalDays */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNumber = i + 1;
          const isToday =
            currentYear === todayYear &&
            currentMonth === todayMonth &&
            dayNumber === todayDay;
          const isSelected = selectedJalaliDay === dayNumber;
          const dayDots = dotsByDay[dayNumber] || [];
          const isFriday = (firstDayOfWeek + i) % 7 === 6;

          return (
            <button
              key={`day-${dayNumber}`}
              type="button"
              onClick={() => handleDayClick(dayNumber)}
              className={`h-8 w-full flex flex-col items-center justify-center rounded-lg text-xs font-mono transition-colors relative cursor-pointer ${
                isSelected
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : isToday
                  ? 'bg-sky-50 text-sky-700 font-bold border border-sky-300'
                  : isFriday
                  ? 'text-rose-500 hover:bg-rose-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{toPersianDigits(dayNumber)}</span>

              {/* Event dots indicator matching PersianCalendarWidget.cpp */}
              {dayDots.length > 0 && (
                <div className="flex items-center gap-0.5 absolute bottom-0.5">
                  {dayDots.slice(0, 3).map((c, dotIdx) => (
                    <span
                      key={dotIdx}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
