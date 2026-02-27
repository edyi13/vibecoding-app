import { Suspense } from "react";
import { getTasks, getTasksForCalendar, DateFilterMode } from "./actions";
import { Sidebar } from "@/components/Sidebar";
import { TasksContent } from "@/components/TasksContent";

interface PageProps {
  searchParams: Promise<{ date?: string; by?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { date, by } = await searchParams;
  const filterBy: DateFilterMode = by === "created" ? "created" : "due";

  const [allTasks, activeTasks, completedTasks] = await Promise.all([
    getTasks(date, undefined, filterBy),
    getTasks(date, false, filterBy),
    getTasks(date, true, filterBy),
  ]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const calendarTasks = await getTasksForCalendar(currentYear, currentMonth);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto flex gap-8">
        <Suspense fallback={<div className="w-64 h-96 bg-white/50 rounded-2xl animate-pulse" />}>
          <Sidebar tasks={allTasks} />
        </Suspense>

        <Suspense fallback={<div className="flex-1 h-96 bg-white/50 rounded-2xl animate-pulse" />}>
          <TasksContent
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            calendarTasks={calendarTasks}
            initialMonth={{ year: currentYear, month: currentMonth }}
            filterDate={date}
            filterBy={filterBy}
          />
        </Suspense>
      </div>
    </div>
  );
}
