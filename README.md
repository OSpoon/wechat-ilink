# WeChat iLink

[English](README.md) | [简体中文](README.zh-CN.md)

WeChat iLink is a messaging API and administration console built with AdonisJS, React, and SQLite. The project is a pnpm workspace managed with Turborepo, and its React interface extends the [shadcn-admin](https://github.com/satnaing/shadcn-admin) foundation.

## Features

- Admin console for a live WeChat dashboard, chats, accounts, webhooks, profile, and appearance settings.
- AdonisJS API for sign-up, sign-in, account preferences, and the WeChat iLink service.
- WeChat iLink API for QR account linking, connection controls, message history and delivery, media transfer, typing status, and signed webhooks.
- The React chat page uses live WeChat messages; account, webhook, delivery, and health views follow the existing admin routes and query patterns.
- SQLite persistence through Lucid migrations.
- Shared lint, formatting, TypeScript, test, and build checks, with Git hooks and GitHub Actions CI.
- Docker Compose deployment with persistent SQLite storage and health checks.

The console keeps the product surfaces used by WeChat iLink: a live account and webhook dashboard, WeChat chats and account management, webhook delivery records, account profile, and appearance settings. Chat history and account data come from the configured iLink service and local SQLite database.

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

Generate the backend application key; AdonisJS writes it directly to
`apps/backend/.env`:

```sh
pnpm --filter @wechat-ilink/backend exec node ace generate:key
```

Keep `.env` files and their secrets local.

Create the SQLite schema and start both apps:

```sh
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173), then create an account at [http://localhost:5173/sign-up](http://localhost:5173/sign-up). The Vite server proxies `/api` requests to the backend at `http://localhost:3333`. The API health endpoint is [http://localhost:3333/health](http://localhost:3333/health).

The local database is `apps/backend/tmp/db.sqlite3`. Migrations create the schema; the project does not populate it with example tasks, users, integrations, or conversations.

WeChat iLink settings are included in `apps/backend/.env.example`. Create an account from the frontend sign-up page, sign in, then scan a QR code from **WeChat Accounts**. API reference is available at `/docs`; see the [WeChat iLink API guide](docs/weixin-api.md) for endpoint usage.

## Configuration

| File                                                                 | Setting                               | Purpose                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `apps/backend/.env`                                                  | `APP_KEY`                             | Required secret used by AdonisJS. Generate a private key for each environment.                           |
| `apps/backend/.env`                                                  | `HOST`, `PORT`, `APP_URL`             | Backend bind address and application URL. Defaults are `localhost`, `3333`, and `http://localhost:3333`. |
| `apps/backend/.env`                                                  | `LOG_LEVEL`, `SESSION_DRIVER`         | Logging and session storage. The Vite proxy avoids cross-origin requests in local development.           |
| `apps/backend/.env`                                                  | `ILINK_*`                             | iLink protocol client, service URLs, and media CDN settings; the example file provides defaults.         |
| `apps/backend/.env`                                                  | `LIMITER_STORE`, `MEDIA_STORAGE_PATH` | API rate-limit storage and the persistent local-media directory.                                         |
| `apps/frontend/.env`                                                 | `VITE_API_URL`                        | API base URL; defaults to `/api/v1` for the local proxy and same-origin deployment.                      |
| AdonisJS email and password authentication is used for all accounts. |

For Docker deployment, use the installer below or follow the [manual deployment guide](docs/deployment.md). Never commit environment files, credentials, or local SQLite databases.

### Docker one-line install

On a host with Docker Engine and the Docker Compose plugin, run:

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/wechat-ilink/main/deploy/install.sh | sh
```

The installer downloads the Compose files, generates a private `APP_KEY`, and starts the frontend and backend. It defaults to port `8080` and installs under `/opt/wechat-ilink` as root or `~/wechat-ilink` otherwise. The published GHCR images are public and can be pulled without logging in. Set `WECHAT_ILINK_APP_URL` on the `sh` side of the pipe to configure a public site URL. See the [deployment guide](docs/deployment.md) for configuration and updates.

VS Code project settings enable ESLint and Prettier integration and recommend the relevant extensions through `.vscode/`.

## Development commands

| Command                                                     | Description                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                                                  | Start the backend and frontend in watch mode.                    |
| `pnpm check`                                                | Run lint, formatting, type checks, tests, and production builds. |
| `pnpm --filter @wechat-ilink/backend db:migrate`            | Apply local database migrations.                                 |
| `pnpm --filter @wechat-ilink/backend typecheck`             | Generate AdonisJS types and check backend TypeScript.            |
| `pnpm --filter @wechat-ilink/frontend test:browser:install` | Install Chromium for frontend browser tests.                     |

Backend tests use a separate SQLite database at `apps/backend/tmp/db.test.sqlite3`.

## CI and releases

Pull requests and pushes to `main` run the quality checks in GitHub Actions. A pushed `v*` tag runs the checks, publishes backend and frontend images to GitHub Container Registry, then creates a GitHub Release with generated release notes. Create a release with `pnpm release`; review its version changes and generated changelog before pushing the release commit and tag. The workflow does not deploy images to a server automatically.

See [development and release instructions](docs/development.md) and the [deployment guide](docs/deployment.md) for the full process.

## Project structure

The [backend workspace](apps/backend/README.md) contains the AdonisJS API, SQLite migrations, and tests. The [frontend workspace](apps/frontend/README.md) contains the React console. Docker assets live in `deploy/`, with project guides in `docs/`.

Project-wide engineering rules are in [AGENTS.md](AGENTS.md), with backend and frontend addenda in their respective app directories. Third-party license terms are recorded in [apps/frontend/LICENSE](apps/frontend/LICENSE).
