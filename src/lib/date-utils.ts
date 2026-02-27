import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addDays,
} from "date-fns";

export function getCalendarDays(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

export function formatDateForUrl(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}

export function parseDateFromUrl(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  try {
    // Parse as local date by adding time component
    return new Date(dateString + "T00:00:00");
  } catch {
    return null;
  }
}

function extractTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatGoogleDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

export function generateGoogleCalendarUrl(task: {
  title: string;
  dueDate: Date | null;
  createdAt: Date;
}): string {
  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.title,
  });

  const eventDate = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
  const hasTime = task.dueDate && extractTime(eventDate) !== "00:00";

  if (hasTime) {
    // Timed event: 1 hour duration
    const start = formatGoogleDate(eventDate);
    const end = formatGoogleDate(new Date(eventDate.getTime() + 60 * 60 * 1000));
    params.set("dates", `${start}/${end}`);
  } else {
    // All-day event
    const dateStr = format(eventDate, "yyyyMMdd");
    const nextDay = format(addDays(eventDate, 1), "yyyyMMdd");
    params.set("dates", `${dateStr}/${nextDay}`);
  }

  return `${baseUrl}?${params.toString()}`;
}

export { isSameDay, isSameMonth, addMonths, subMonths, format };
