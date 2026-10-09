# Backend

[English](README.md) | [简体中文](README.zh-CN.md)

AdonisJS API used by the React admin and client applications. It provides authentication, account preferences, WeChat iLink QR login, account management, message/media transport, and webhooks, with SQLite persistence through Lucid migrations.

For the full project setup, start with the [root README](../../README.md) and [development guide](../../docs/development.md). Backend-specific rules are in [AGENTS.md](AGENTS.md).

## Local setup

From the repository root, copy the examples and generate the backend application key. AdonisJS writes the key directly to `apps/backend/.env`:

```sh
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm --filter @wechat-ilink/backend exec node ace generate:key
```

Apply migrations and start the workspace:

```sh
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

The API listens on `http://localhost:3333`. The development database is `apps/backend/tmp/db.sqlite3`; tests use the separate `apps/backend/tmp/db.test.sqlite3` file.

## Configuration

| Variable                  | Purpose                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `APP_KEY`                 | Required AdonisJS encryption key. Generate a private key for each environment.                          |
| `HOST`, `PORT`, `APP_URL` | Bind address, port, and application URL. Defaults are `localhost`, `3333`, and `http://localhost:3333`. |
| `LOG_LEVEL`               | Application log verbosity.                                                                              |
| `SESSION_DRIVER`          | Session storage driver; local development defaults to `cookie`.                                         |
| `ILINK_*`                 | iLink protocol client, WeChat service URL, CDN, and bot type; defaults are listed in `.env.example`.    |
| `LIMITER_STORE`           | Store API rate limits in `database` (SQLite) or `memory`.                                               |
| `MEDIA_STORAGE_PATH`      | Persistent directory for outbound media files; defaults to `data/media`.                                |

SQLite is the configured local and single-container database. Its path is set in `config/database.ts`; test mode selects the isolated test database automatically.

## API overview

| Area            | Routes                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Health          | `GET /health`                                                                                                                           |
| Authentication  | `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`                                                                                   |
| Account         | `GET /api/v1/account/profile`, `POST /api/v1/account/logout`, `GET /api/v1/account/settings`, `PATCH /api/v1/account/settings/:section` |
| WeChat accounts | `/api/v1/weixin/accounts`, `/api/v1/weixin/login-sessions`                                                                              |
| WeChat messages | `/api/v1/weixin/accounts/:accountId/messages`, `/media`, `/typing`                                                                      |
| Webhooks        | `/api/v1/weixin/webhooks`, `/api/v1/weixin/webhooks/:webhookId/deliveries`                                                              |

See the [WeChat iLink API guide](../../docs/weixin-api.md) for the full request flow and examples. Interactive OpenAPI docs are served at `/docs`.

Create your account from the frontend sign-up page or `POST /api/v1/auth/signup`, then sign in. Signup and login return an access token; protected routes accept that token.

## Backend commands

Run from the repository root:

| Command                                            | Description                                           |
| -------------------------------------------------- | ----------------------------------------------------- |
| `pnpm --filter @wechat-ilink/backend dev`          | Start only the API with hot reload.                   |
| `pnpm --filter @wechat-ilink/backend db:migrate`   | Apply SQLite migrations.                              |
| `pnpm --filter @wechat-ilink/backend test`         | Run backend tests against the isolated test database. |
| `pnpm --filter @wechat-ilink/backend typecheck`    | Generate AdonisJS types and run TypeScript checks.    |
| `pnpm --filter @wechat-ilink/backend lint:check`   | Run ESLint with warnings treated as errors.           |
| `pnpm --filter @wechat-ilink/backend format:check` | Verify formatting without changing files.             |
| `pnpm --filter @wechat-ilink/backend build`        | Build the production API.                             |

The root `pnpm check` command runs the complete workspace verification sequence.
