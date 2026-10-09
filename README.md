# adonisjs-shadcn-admin

[English](README.md) | [简体中文](README.zh-CN.md)

A full-stack admin starter that pairs the [shadcn-admin](https://github.com/satnaing/shadcn-admin) React dashboard with an AdonisJS API and SQLite. The project is a pnpm workspace managed with Turborepo.

## Features

- Admin dashboard with a responsive sidebar, command search, themes, RTL layout, tables, dialogs, and settings.
- AdonisJS API for sign-up, sign-in, profile, tasks, directory users, integrations, chats, dashboard data, and account preferences.
- Optional Clerk sign-in alongside native AdonisJS authentication, with Clerk sessions verified by the API and linked to SQLite users.
- SQLite persistence through Lucid migrations and seeders.
- Shared lint, formatting, TypeScript, test, and build checks, with Git hooks and GitHub Actions CI.
- Docker Compose deployment with persistent SQLite storage and health checks.

Dashboard profile, task, directory-user, integration, chat, and account views use the local API. Integration cards and seeded directory records are demonstration data; connecting a card does not configure an external service or send invitation email.

## Quick start

### Requirements

- Node.js `24.15.0`
- pnpm `10.15.1` (pinned in the root `package.json`)

### Install and configure

Run these commands from the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Generate an AdonisJS application key:

```sh
pnpm --filter @asa/backend exec node ace generate:key
```

Copy the generated value into `APP_KEY` in `apps/backend/.env`. Keep `.env` files and their secrets local.

Create the SQLite schema, load the demo records, and start both apps:

```sh
pnpm --filter @asa/backend db:migrate
pnpm --filter @asa/backend db:seed
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173), then create an account at [http://localhost:5173/sign-up](http://localhost:5173/sign-up). The Vite server proxies `/api` requests to the backend at `http://localhost:3333`. The API health endpoint is [http://localhost:3333/health](http://localhost:3333/health).

The local database is `apps/backend/tmp/db.sqlite3`. The seed command adds 100 tasks, 500 directory users, 15 integrations, and the template chat conversations. It only seeds tables that are empty, so it is safe to rerun during development. Do not load demo records into a production database.

## Configuration

| File                 | Setting                                      | Purpose                                                                                                       |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/backend/.env`  | `APP_KEY`                                    | Required secret used by AdonisJS. Generate a private key for each environment.                                |
| `apps/backend/.env`  | `HOST`, `PORT`, `APP_URL`                    | Backend bind address and application URL. Defaults are `localhost`, `3333`, and `http://localhost:3333`.      |
| `apps/backend/.env`  | `LOG_LEVEL`, `SESSION_DRIVER`, `CORS_ORIGIN` | Logging, session storage, and optional allowed origins for cross-origin setups.                               |
| `apps/backend/.env`  | `CLERK_SECRET_KEY`                           | Optional Clerk Backend API key. Set it to enable Clerk sessions on protected API routes.                      |
| `apps/backend/.env`  | `CLERK_AUTHORIZED_PARTIES`                   | Optional comma-separated frontend origins allowed to send Clerk session tokens. Set this in production.       |
| `apps/frontend/.env` | `VITE_API_URL`                               | API base URL; defaults to `/api/v1` for the local proxy and same-origin deployment.                           |
| `apps/frontend/.env` | `VITE_CLERK_PUBLISHABLE_KEY`                 | Optional Clerk frontend key. Pair it with the backend key to show Clerk sign-in and use Clerk for API access. |

With both Clerk keys configured, the sign-in and sign-up screens offer Clerk as an alternative. Clerk users are
matched to existing local accounts only when their primary Clerk email is verified; otherwise a local SQLite user
is created and linked by Clerk user ID. AdonisJS email/password sign-in remains available. For Docker deployments,
set `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_AUTHORIZED_PARTIES` in `deploy/.env`.

For Docker deployment, use the installer below or follow the [manual deployment guide](docs/deployment.md). Never commit environment files, credentials, or local SQLite databases.

### Docker one-line install

On a host with Docker Engine and the Docker Compose plugin, run:

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/adonisjs-shadcn-admin/main/deploy/install.sh | sh
```

The installer downloads the Compose files, generates a private `APP_KEY`, and starts the frontend and backend. It defaults to port `8080` and installs under `/opt/asa` as root or `~/asa` otherwise. The published GHCR images are public and can be pulled without logging in. Set `ASA_APP_URL` on the `sh` side of the pipe to configure a public site URL. See the [deployment guide](docs/deployment.md) for configuration and updates.

VS Code project settings enable ESLint and Prettier integration and recommend the relevant extensions through `.vscode/`.

## Development commands

| Command                                            | Description                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                                         | Start the backend and frontend in watch mode.                    |
| `pnpm check`                                       | Run lint, formatting, type checks, tests, and production builds. |
| `pnpm --filter @asa/backend db:migrate`            | Apply local database migrations.                                 |
| `pnpm --filter @asa/backend db:seed`               | Load development demo data.                                      |
| `pnpm --filter @asa/frontend test:browser:install` | Install Chromium for frontend browser tests.                     |

Backend tests use a separate SQLite database at `apps/backend/tmp/db.test.sqlite3`.

## CI and releases

Pull requests and pushes to `main` run the quality checks in GitHub Actions. A pushed `v*` tag runs the checks, publishes backend and frontend images to GitHub Container Registry, then creates a GitHub Release with generated release notes. Create a release with `pnpm release`; review its version changes and generated changelog before pushing the release commit and tag. The workflow does not deploy images to a server automatically.

See [development and release instructions](docs/development.md) and the [deployment guide](docs/deployment.md) for the full process.

## Project structure

The [backend workspace](apps/backend/README.md) contains the AdonisJS API, SQLite migrations, seeders, and tests. The [frontend workspace](apps/frontend/README.md) contains the React dashboard based on satnaing/shadcn-admin. Docker assets live in `deploy/`, with project guides in `docs/`.

Project-wide engineering rules are in [AGENTS.md](AGENTS.md), with backend and frontend addenda in their respective app directories. Third-party license terms are recorded in [apps/frontend/LICENSE](apps/frontend/LICENSE).
