# Workspace

## Overview

Full-stack project management web application with role-based access control, built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/project-manager)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Application Features

- Authentication (signup/login) with JWT tokens
- Role-based access control (Admin/Member)
- Project creation & management
- Task creation, assignment, status tracking (todo/in_progress/done)
- Team member management per project
- Dashboard with summary stats, overdue tasks, recent activity feed
- Progress tracking per project

## Demo Credentials

- Admin: alice@demo.com / password123
- Member: bob@demo.com / password123

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes

All routes prefixed with `/api`:
- `POST /auth/register` — register user
- `POST /auth/login` — login
- `GET /auth/me` — get current user
- `GET /users` — list users (admin only)
- `GET/POST /projects` — list/create projects
- `GET/PUT/DELETE /projects/:id` — project CRUD
- `GET/POST /projects/:id/members` — manage members
- `DELETE /projects/:id/members/:userId` — remove member
- `GET/POST /projects/:id/tasks` — list/create tasks
- `GET/PUT/DELETE /projects/:id/tasks/:taskId` — task CRUD
- `GET /dashboard/summary` — stats
- `GET /dashboard/my-tasks` — assigned tasks
- `GET /dashboard/overdue` — overdue tasks
- `GET /dashboard/activity` — recent activity

## DB Schema

Tables: users, projects, project_members, tasks, activity

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
