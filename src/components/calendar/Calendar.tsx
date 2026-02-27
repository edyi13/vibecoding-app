"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addMonths,
  subMonths,
  formatDateForUrl,
  parseDateFromUrl,
  isSameMonth,
} from "@/lib/date-utils";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { getTasksForCalendar } from "@/app/actions";
import type { TaskIndicator } from "@/lib/types";

interface CalendarProps {
  initialTasks: TaskIndicator[];
  initialMonth: { year: number; month: number };
}

export function Calendar({ initialTasks, initialMonth }: CalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(initialMonth.year, initialMonth.month, 1)
  );
  const [tasks, setTasks] = useState<TaskIndicator[]>(initialTasks);
  const [isInitialMonth, setIsInitialMonth] = useState(true);

  const selectedDate = parseDateFromUrl(searchParams.get("date") ?? undefined);

  // Update tasks when initialTasks prop changes (from server revalidation)
  useEffect(() => {
    if (isInitialMonth) {
      setTasks(initialTasks);
    }
  }, [initialTasks, isInitialMonth]);

  // Fetch tasks when navigating to a different month
  useEffect(() => {
    const initialDate = new Date(initialMonth.year, initialMonth.month, 1);
    if (!isSameMonth(currentMonth, initialDate)) {
      setIsInitialMonth(false);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      getTasksForCalendar(year, month).then(setTasks);
    } else {
      setIsInitialMonth(true);
    }
  }, [currentMonth, initialMonth.year, initialMonth.month]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(today);
    router.push("/");
  };

  const handleSelectDate = (date: Date) => {
    const dateStr = formatDateForUrl(date);
    router.push(`/?date=${dateStr}`);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <CalendarHeader
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />
      <CalendarGrid
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        today={today}
        tasks={tasks}
        onSelectDate={handleSelectDate}
      />
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Due date
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Created
        </span>
      </div>
    </div>
  );
}
