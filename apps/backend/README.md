# Backend

[English](README.md) | [简体中文](README.zh-CN.md)

AdonisJS API used by the React admin frontend. It provides authentication and the dashboard data APIs, with SQLite persistence through Lucid migrations.

For the full project setup, start with the [root README](../../README.md) and [development guide](../../docs/development.md). Backend-specific rules are in [AGENTS.md](AGENTS.md).

## Local setup

Run commands from the repository root. Copy `apps/backend/.env.example` to `apps/backend/.env`, generate an application key, and set it as `APP_KEY`:

```sh
cp apps/backend/.env.example apps/backend/.env
pnpm --filter @asa/backend exec node ace generate:key
```

Apply migrations, optionally load the demo data, and start the workspace:

```sh
pnpm --filter @asa/backend db:migrate
pnpm --filter @asa/backend db:seed
pnpm dev
```

The API listens on `http://localhost:3333`. The development database is `apps/backend/tmp/db.sqlite3`; tests use the separate `apps/backend/tmp/db.test.sqlite3` file.

## Configuration

| Variable                   | Purpose                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `APP_KEY`                  | Required AdonisJS encryption key. Generate a private key for each environment.                                |
| `HOST`, `PORT`, `APP_URL`  | Bind address, port, and application URL. Defaults are `localhost`, `3333`, and `http://localhost:3333`.       |
| `LOG_LEVEL`                | Application log verbosity.                                                                                    |
| `SESSION_DRIVER`           | Session storage driver; local development defaults to `cookie`.                                               |
| `CORS_ORIGIN`              | Optional allowed origins for a frontend hosted on a separate origin.                                          |
| `CLERK_SECRET_KEY`         | Optional Clerk Backend API key. Enables Clerk session verification and local user linking.                    |
| `CLERK_AUTHORIZED_PARTIES` | Optional comma-separated frontend origins checked against Clerk's `azp` token claim. Configure in production. |

SQLite is the configured local and single-container database. Its path is set in `config/database.ts`; test mode selects the isolated test database automatically.

## API overview

| Area            | Routes                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Health          | `GET /health`                                                                                                                           |
| Authentication  | `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`                                                                                   |
| Account         | `GET /api/v1/account/profile`, `POST /api/v1/account/logout`, `GET /api/v1/account/settings`, `PATCH /api/v1/account/settings/:section` |
| Tasks           | `GET/POST /api/v1/tasks`, bulk create/update/delete, and per-task update/delete                                                         |
| Directory users | `GET/POST /api/v1/directory-users`, invitation, bulk update/delete, and per-user update/delete                                          |
| Integrations    | `GET /api/v1/integrations`, `PATCH /api/v1/integrations/:name`                                                                          |
| Chats           | `GET/POST /api/v1/chats`, `POST /api/v1/chats/:id/messages`                                                                             |
| Dashboard       | `GET /api/v1/dashboard`                                                                                                                 |

AdonisJS sign-up and login return an access token. Protected routes accept that token or, when Clerk is configured, a verified Clerk session token. Clerk identities are linked to local `users` records by Clerk user ID; verified primary email addresses can link an existing local account. The directory records, integrations, tasks, and conversations loaded by the seeder are demo data; integration state does not configure external services or send email.

## Backend commands

Run from the repository root:

| Command                                   | Description                                           |
| ----------------------------------------- | ----------------------------------------------------- |
| `pnpm --filter @asa/backend dev`          | Start only the API with hot reload.                   |
| `pnpm --filter @asa/backend db:migrate`   | Apply SQLite migrations.                              |
| `pnpm --filter @asa/backend db:seed`      | Load demo records into empty tables.                  |
| `pnpm --filter @asa/backend test`         | Run backend tests against the isolated test database. |
| `pnpm --filter @asa/backend typecheck`    | Generate AdonisJS types and run TypeScript checks.    |
| `pnpm --filter @asa/backend lint:check`   | Run ESLint with warnings treated as errors.           |
| `pnpm --filter @asa/backend format:check` | Verify formatting without changing files.             |
| `pnpm --filter @asa/backend build`        | Build the production API.                             |

The root `pnpm check` command runs the complete workspace verification sequence.
