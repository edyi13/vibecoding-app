"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { deleteTask, updateTask, toggleTaskCompleted } from "@/app/actions";
import { format, generateGoogleCalendarUrl } from "@/lib/date-utils";
import type { Task, Priority } from "@/lib/types";

interface TaskCardProps {
  task: Task;
}

const priorityStyles = {
  LOW: {
    card: "bg-green-50 border-green-200",
    checkbox: "border-green-300 bg-green-100",
    time: "text-green-600",
    tag: "bg-green-200 text-green-800",
    label: "Low",
  },
  MEDIUM: {
    card: "bg-amber-50 border-amber-200",
    checkbox: "border-amber-300 bg-amber-100",
    time: "text-amber-600",
    tag: "bg-amber-200 text-amber-800",
    label: "Medium",
  },
  HIGH: {
    card: "bg-red-50 border-red-200",
    checkbox: "border-red-300 bg-red-100",
    time: "text-red-600",
    tag: "bg-red-200 text-red-800",
    label: "High",
  },
};

function extractTime(date: Date): string {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTimeDisplay(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function TaskCard({ task }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""
  );
  const [dueTime, setDueTime] = useState(
    task.dueDate ? extractTime(new Date(task.dueDate)) : ""
  );
  const [priority, setPriority] = useState<Priority>(task.priority);

  const styles = priorityStyles[task.priority];

  const handleToggleCompleted = async () => {
    await toggleTaskCompleted(task.id, !task.completed);
  };

  const handleDelete = async () => {
    setShowMenu(false);
    const result = await Swal.fire({
      title: "Delete Task?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      await deleteTask(task.id);
      Swal.fire({
        title: "Deleted!",
        text: "Task has been deleted.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    setIsEditing(true);
  };

  const handleAddToGoogleCalendar = () => {
    setShowMenu(false);
    const url = generateGoogleCalendarUrl(task);
    window.open(url, "_blank");
  };

  const handleSave = async () => {
    await updateTask(task.id, {
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      priority,
    });
    setIsEditing(false);
    Swal.fire({
      title: "Saved!",
      text: "Task has been updated.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleCancel = () => {
    setDueDate(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
    setDueTime(task.dueDate ? extractTime(new Date(task.dueDate)) : "");
    setPriority(task.priority);
    setIsEditing(false);
  };

  // Check if dueDate has a meaningful time (not 00:00)
  const hasTime = task.dueDate && extractTime(new Date(task.dueDate)) !== "00:00";

  return (
    <div
      className={`${styles.card} border rounded-2xl p-4 relative transition-all hover:shadow-md ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={handleToggleCompleted}
            className={`w-5 h-5 rounded border-2 ${styles.checkbox} flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors`}
          >
            {task.completed && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`font-semibold text-gray-800 ${
                  task.completed ? "line-through" : ""
                }`}
              >
                {task.title}
              </h3>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.tag}`}
              >
                {styles.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {task.dueDate
                ? `Due: ${new Date(task.dueDate).toLocaleDateString()}`
                : `Created: ${new Date(task.createdAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-white/50 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
              />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10 min-w-[120px]">
              <button
                onClick={handleEdit}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
              <button
                onClick={handleAddToGoogleCalendar}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                </svg>
                Google Calendar
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`mt-3 text-sm font-medium ${styles.time} flex items-center gap-1`}>
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {task.dueDate && hasTime
          ? formatTimeDisplay(new Date(task.dueDate))
          : task.dueDate
          ? "All day"
          : formatTimeDisplay(new Date(task.createdAt))}
      </div>

      {isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200/50">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-1.5 bg-white text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
