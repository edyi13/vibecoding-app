
interface Task {
  id: string;
  title: string;
}

interface SidebarProps {
  tasks: Task[];
}

export function Sidebar({ tasks }: SidebarProps) {
  return (
    <aside className="w-64 bg-white rounded-2xl p-6 h-fit sticky top-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <span className="font-bold text-lg text-gray-800">TaskFlow</span>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl">
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Todo List
        </div>

        <ul className="mt-3 space-y-1 pl-4 border-l-2 border-gray-100 ml-6">
          {tasks.slice(0, 5).map((task) => (
            <li key={task.id}>
              <span className="text-sm text-gray-500 truncate block py-1">
                {task.title.length > 20
                  ? task.title.slice(0, 20) + "..."
                  : task.title}
              </span>
            </li>
          ))}
          {tasks.length > 5 && (
            <li className="text-sm text-gray-400 py-1">
              +{tasks.length - 5} more
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
