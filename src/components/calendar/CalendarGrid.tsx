"use client";

import { getCalendarDays, isSameDay } from "@/lib/date-utils";
import { CalendarDay } from "./CalendarDay";
import type { TaskIndicator } from "@/lib/types";

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date | null;
  today: Date;
  tasks: TaskIndicator[];
  onSelectDate: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({
  currentMonth,
  selectedDate,
  today,
  tasks,
  onSelectDate,
}: CalendarGridProps) {
  const days = getCalendarDays(currentMonth);

  const hasDueTask = (date: Date) =>
    tasks.some((task) => task.dueDate && isSameDay(new Date(task.dueDate), date));

  const hasCreatedTask = (date: Date) =>
    tasks.some((task) => isSameDay(new Date(task.createdAt), date));

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <CalendarDay
            key={day.toISOString()}
            day={day}
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            today={today}
            hasDueTask={hasDueTask(day)}
            hasCreatedTask={hasCreatedTask(day)}
            onSelect={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}
