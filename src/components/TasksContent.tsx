"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskCard } from "./TaskCard";
import { AddTaskModal } from "./AddTaskModal";
import { Calendar } from "./calendar/Calendar";
import { format } from "@/lib/date-utils";
import type { Task, TaskIndicator } from "@/lib/types";
import type { DateFilterMode } from "@/app/actions";

interface TasksContentProps {
  activeTasks: Task[];
  completedTasks: Task[];
  calendarTasks: TaskIndicator[];
  initialMonth: { year: number; month: number };
  filterDate?: string;
  filterBy?: DateFilterMode;
}

export function TasksContent({
  activeTasks,
  completedTasks,
  calendarTasks,
  initialMonth,
  filterDate,
  filterBy = "due",
}: TasksContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentDate = new Date();
  const formattedDate = format(currentDate, "do MMM, yyyy");

  const tasks = activeTab === "active" ? activeTasks : completedTasks;
  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClearFilter = () => {
    router.push("/");
  };

  const handleFilterModeChange = (mode: DateFilterMode) => {
    if (filterDate) {
      router.push(`/?date=${filterDate}&by=${mode}`);
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Todo List</h1>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <span className="text-lg">{formattedDate}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search List"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white w-64"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New Task
          </button>
        </div>
      </div>

      {filterDate && (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            {format(new Date(filterDate + "T00:00:00"), "MMM d, yyyy")}
          </span>
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            <button
              type="button"
              onClick={() => handleFilterModeChange("due")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterBy === "due"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Due Date
            </button>
            <button
              type="button"
              onClick={() => handleFilterModeChange("created")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterBy === "created"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Created
            </button>
          </div>
          <button
            type="button"
            onClick={handleClearFilter}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "active"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Active Task
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
            {activeTasks.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "completed"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Completed
          <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">
            {completedTasks.length}
          </span>
        </button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {searchQuery ? "No tasks found" : "No tasks yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? "Try a different search term"
              : "Create your first task to get started"}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Add Task
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Calendar</h2>
        <Calendar initialTasks={calendarTasks} initialMonth={initialMonth} />
      </div>

      <AddTaskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultDate={filterDate}
      />
    </div>
  );
}
