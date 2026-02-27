# TaskFlow - AI-Powered Task Scheduler

An intelligent task management application built with Next.js 14, featuring AI-powered task parsing using Claude, a beautiful calendar interface, and seamless Google Calendar integration.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Feature Flags](#feature-flags)
- [API Reference](#api-reference)
- [AI Integration](#ai-integration)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Task Management
- **Create, Read, Update, Delete** tasks with an intuitive interface
- **Priority Levels** - LOW (green), MEDIUM (amber), HIGH (red) with visual indicators
- **Due Dates & Times** - Set specific deadlines for your tasks
- **Completion Tracking** - Mark tasks as complete/incomplete with visual feedback
- **Tab-based Views** - Switch between Active and Completed tasks

### AI-Powered Task Parsing
- **Natural Language Input** - Type "Buy groceries tomorrow" and let AI parse it
- **Automatic Extraction** of:
  - Clean task title (removes date/time references)
  - Estimated duration
  - Deadline detection
  - Priority inference (based on urgency words like "urgent", "asap")
- **Graceful Fallback** - Works even if AI is unavailable

### Interactive Calendar
- **Monthly View** - Navigate through months with previous/next buttons
- **Visual Task Indicators**:
  - Blue dots for due dates
  - Green dots for creation dates
- **Click-to-Filter** - Click any day to filter tasks for that date
- **Quick Navigation** - "Today" button to jump to current date

### Google Calendar Integration
- **One-Click Export** - Add tasks directly to Google Calendar
- **Smart Event Creation**:
  - Tasks with time become timed events (1-hour duration)
  - Tasks without time become all-day events
- **No Authentication Required** - Uses Google Calendar's URL scheme

### Search & Filtering
- **Real-time Search** - Filter tasks by title instantly
- **Date Filtering** - View tasks by due date or creation date
- **URL-based Filters** - Shareable filtered views via query parameters

### Resilient Storage
- **Primary**: PostgreSQL database via Prisma ORM
- **Fallback**: Local JSON file storage when database is unavailable
- **Automatic Switching** - Seamlessly switches based on database availability

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **AI** | Anthropic Claude API |
| **Styling** | Tailwind CSS |
| **Testing** | Vitest + React Testing Library |
| **Date Handling** | date-fns |
| **Alerts** | SweetAlert2 |

## Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or yarn/pnpm)
- **PostgreSQL** 14.x or higher (optional with local storage fallback)
- **Anthropic API Key** for AI features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vibecoding-app.git
   cd vibecoding-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file** (see [Environment Variables](#environment-variables))

5. **Set up the database** (see [Database Setup](#database-setup))

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/taskdb?schema=public"

# Anthropic API key for AI-powered task parsing
ANTHROPIC_API_KEY="sk-ant-..."

# Local storage fallback (set to "true" to enable file-based storage when DB is unavailable)
ENABLE_LOCAL_STORAGE_FALLBACK="false"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes* | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | No | Enables AI task parsing (falls back to manual input) |
| `ENABLE_LOCAL_STORAGE_FALLBACK` | No | Set to `"true"` for offline/no-DB mode |

*Not required if `ENABLE_LOCAL_STORAGE_FALLBACK` is `"true"`

### Database Setup

1. **Create a PostgreSQL database**
   ```bash
   createdb taskdb
   ```

2. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

3. **Push the schema to your database**
   ```bash
   npm run db:push
   ```

4. **(Optional) Open Prisma Studio** to view/edit data
   ```bash
   npm run db:studio
   ```

## Running the Application

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Testing

The application includes comprehensive unit tests covering all core functionality.

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

### Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/lib/date-utils.test.ts` | 21 | Date utilities, Google Calendar URL generation |
| `src/lib/storage/local-storage-adapter.test.ts` | 24 | CRUD operations, filtering, edge cases |
| `src/lib/storage/task-repository.test.ts` | 18 | DB/localStorage switching, filter passing |
| `src/app/actions.test.ts` | 29 | All server actions, AI parsing, error handling |

**Total: 92 tests**

## Project Structure

```
vibecoding-app/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with metadata
│   │   ├── page.tsx           # Main page (server component)
│   │   ├── actions.ts         # Server actions for CRUD
│   │   ├── actions.test.ts    # Server action tests
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── TasksContent.tsx   # Main content with tabs/filters
│   │   ├── TaskCard.tsx       # Individual task card
│   │   ├── AddTaskModal.tsx   # New task modal
│   │   └── calendar/
│   │       ├── Calendar.tsx       # Calendar container
│   │       ├── CalendarHeader.tsx # Month navigation
│   │       ├── CalendarGrid.tsx   # Calendar grid
│   │       └── CalendarDay.tsx    # Day cell component
│   └── lib/
│       ├── types.ts           # TypeScript interfaces
│       ├── date-utils.ts      # Date utilities
│       ├── date-utils.test.ts # Date utility tests
│       ├── ai-parser.ts       # Claude AI integration
│       ├── prisma.ts          # Prisma client singleton
│       └── storage/
│           ├── index.ts               # Storage exports
│           ├── types.ts               # Storage interfaces
│           ├── feature-flags.ts       # Feature flag config
│           ├── task-repository.ts     # Repository pattern
│           ├── task-repository.test.ts
│           ├── local-storage-adapter.ts
│           └── local-storage-adapter.test.ts
├── .env.example               # Environment template
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## Architecture

### Data Flow

```
┌─────────────────┐
│   User Input    │
│ (TaskCard/Modal)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Server Action  │
│ (addTask, etc.) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI Parser     │ ◄── Claude API (optional)
│ (parseTaskWithAI)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Task Repository │
│ (checks DB/flag)│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌──────────┐
│Prisma │ │  Local   │
│  ORM  │ │ Storage  │
└───┬───┘ └────┬─────┘
    │          │
    ▼          ▼
┌───────┐ ┌──────────┐
│  DB   │ │  JSON    │
│(Postgres)│ │  File  │
└───────┘ └──────────┘
```

### Design Patterns

| Pattern | Usage |
|---------|-------|
| **Repository** | Abstract storage (Prisma vs Local Storage) |
| **Feature Flags** | Toggle local storage fallback |
| **Server Components** | Data fetching on server |
| **Server Actions** | Secure mutations from client |
| **Singleton** | Prisma client instance |

### State Management

- **Server State**: Fetched via server actions, cached by Next.js
- **Client State**: React useState for UI (modals, tabs, search)
- **URL State**: Filter parameters in query string (`?date=2024-01-15&by=due`)

## Feature Flags

### Local Storage Fallback

When enabled, the application stores tasks in a local JSON file (`.local-tasks.json`) instead of the database. This is useful for:

- Development without a database
- Offline usage
- Demo/testing purposes

**Enable:**
```env
ENABLE_LOCAL_STORAGE_FALLBACK="true"
```

**Behavior:**
1. Checks database connectivity every 30 seconds
2. If DB is unavailable and flag is enabled, uses local storage
3. Automatically switches back to DB when available

**To Remove This Feature:**

See `src/lib/storage/feature-flags.ts` for complete removal instructions.

## API Reference

### Server Actions

All actions are defined in `src/app/actions.ts` and use the `"use server"` directive.

#### `addTask(formData: FormData)`

Creates a new task with optional AI parsing.

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Task title/description |
| `dueDate` | string | No | Date in `YYYY-MM-DD` format |
| `dueTime` | string | No | Time in `HH:mm` format |
| `priority` | string | No | `LOW`, `MEDIUM`, or `HIGH` |

**Returns:** `{ success: true }` or `{ success: false, error: string }`

---

#### `deleteTask(id: string)`

Deletes a task by ID.

**Returns:** `{ success: true }` or `{ success: false, error: string }`

---

#### `updateTask(id: string, data: UpdateData)`

Updates task properties.

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `dueDate` | string \| null | New due date or null to clear |
| `dueTime` | string \| null | New due time |
| `priority` | Priority | New priority level |

**Returns:** `{ success: true }` or `{ success: false, error: string }`

---

#### `toggleTaskCompleted(id: string, completed: boolean)`

Marks a task as complete or incomplete.

**Returns:** `{ success: true }` or `{ success: false, error: string }`

---

#### `getTasks(filterDate?, completed?, filterBy?)`

Fetches tasks with optional filters.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filterDate` | string | - | Filter by date (`YYYY-MM-DD`) |
| `completed` | boolean | - | Filter by completion status |
| `filterBy` | `"due"` \| `"created"` | `"due"` | Which date field to filter |

**Returns:** `Task[]`

---

#### `getTasksForCalendar(year: number, month: number)`

Fetches task indicators for calendar display.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | number | Full year (e.g., 2024) |
| `month` | number | Month index (0-11) |

**Returns:** `TaskIndicator[]` (id, createdAt, dueDate only)

## AI Integration

The application uses **Claude AI** (model: `claude-sonnet-4-20250514`) to intelligently parse task input.

### How It Works

1. User enters natural language: `"Submit report by Friday urgent"`
2. AI extracts:
   ```json
   {
     "cleanedTitle": "Submit report",
     "estimatedMinutes": 60,
     "deadline": "2024-01-19",
     "priority": "HIGH"
   }
   ```
3. User-provided values (from form) override AI suggestions
4. Task is created with combined data

### Priority Detection

| Keywords | Priority |
|----------|----------|
| urgent, asap, important, critical | HIGH |
| low priority, whenever, no rush | LOW |
| (default) | MEDIUM |

### Fallback Behavior

If AI parsing fails (API error, invalid response), the application:
1. Uses the raw title as-is
2. Sets default values (60 min, MEDIUM priority, no deadline)
3. Allows task creation to proceed

## Database Schema

```prisma
model Task {
  id               String    @id @default(uuid())
  title            String
  createdAt        DateTime  @default(now())
  dueDate          DateTime?
  priority         Priority  @default(MEDIUM)
  completed        Boolean   @default(false)
  estimatedMinutes Int       @default(60)
  deadline         DateTime?
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Write tests** for your changes
4. **Ensure** all tests pass (`npm run test:run`)
5. **Lint** your code (`npm run lint`)
6. **Commit** your changes (`git commit -m 'Add amazing feature'`)
7. **Push** to the branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

### Code Style

- TypeScript strict mode enabled
- ESLint + Next.js recommended rules
- Prettier for formatting (if configured)

### Testing Guidelines

- Write tests for all new server actions
- Test both success and error cases
- Mock external dependencies (Prisma, AI parser)
- Maintain >80% coverage for new code

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Anthropic](https://www.anthropic.com/) - Claude AI API
- [Prisma](https://www.prisma.io/) - Database ORM
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [date-fns](https://date-fns.org/) - Date utilities
- [SweetAlert2](https://sweetalert2.github.io/) - Beautiful alerts

---

Built with AI assistance by Claude
