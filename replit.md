# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is "Xeno Sir" - a premium AI Macroeconomics tutor platform for Xeno Sir's students.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Frontend**: React + Vite + Tailwind CSS (dark academic theme)

## Project: Xeno Sir AI Tutor

### Features
- **Role-based auth**: Admin (can add/manage lectures & students) + Students (can only chat and take exams)
- **Lecture management**: Admin adds lecture transcripts; all students see updates instantly
- **AI Chat**: Bilingual (Hindi/Urdu + English) streaming chat using actual lecture transcripts as context
- **Exams**: Generate MCQ/Subjective/Mixed exams from specific lectures or all lectures, difficulty levels: Basic/Medium/Advanced/Extreme
- **Admin Panel**: Manage lectures (CRUD), manage students, view student chat histories
- **Student Chat History**: Admin can view all student conversations; students can't see each other's chats

### Default Admin Credentials
- Username: `admin`
- Password: `admin123`

### Adding New Students
Only admin can add students via the Admin Panel > Students tab.

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── xeno-sir/           # React frontend (Xeno Sir AI Tutor)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server integration
│   └── integrations-openai-ai-react/   # OpenAI React integration
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
└── package.json
```

## Database Schema

- `users` - Admin and student accounts (role: 'admin' | 'student')
- `lectures` - Lecture transcripts (lectureNumber, title, transcript)
- `conversations` - Chat sessions per user (userId FK)
- `messages` - Individual chat messages (conversationId FK)

## API Routes

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Lectures (students: read-only, admin: full CRUD)
- `GET /api/lectures` - List lectures
- `POST /api/lectures` - Create lecture (admin only)
- `PUT /api/lectures/:id` - Update lecture (admin only)
- `DELETE /api/lectures/:id` - Delete lecture (admin only)

### Students (admin only)
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student with conversations
- `DELETE /api/students/:id` - Delete student

### Chat
- `POST /api/chat/ask` - Ask Xeno Sir (SSE streaming with lecture context)
- `POST /api/chat/exam` - Generate exam from lectures

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Codegen

Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
