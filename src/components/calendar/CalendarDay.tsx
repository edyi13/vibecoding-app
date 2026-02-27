"use client";

import { isSameDay, isSameMonth, format } from "@/lib/date-utils";

interface CalendarDayProps {
  day: Date;
  currentMonth: Date;
  selectedDate: Date | null;
  today: Date;
  hasDueTask: boolean;
  hasCreatedTask: boolean;
  onSelect: (date: Date) => void;
}

export function CalendarDay({
  day,
  currentMonth,
  selectedDate,
  today,
  hasDueTask,
  hasCreatedTask,
  onSelect,
}: CalendarDayProps) {
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isToday = isSameDay(day, today);
  const isSelected = selectedDate && isSameDay(day, selectedDate);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={`
        relative h-10 w-full flex items-center justify-center text-sm rounded-xl
        transition-all font-medium
        ${!isCurrentMonth ? "text-gray-300" : "text-gray-700 hover:bg-blue-50"}
        ${isToday && !isSelected ? "bg-blue-100 text-blue-600" : ""}
        ${isSelected ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : ""}
      `}
    >
      {format(day, "d")}
      {(hasDueTask || hasCreatedTask) && (
        <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
          {hasDueTask && (
            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-blue-500"}`} />
          )}
          {hasCreatedTask && (
            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-blue-200" : "bg-green-500"}`} />
          )}
        </span>
      )}
    </button>
  );
}
