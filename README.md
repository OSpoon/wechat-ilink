# WeChat iLink

[English](README.md) | [简体中文](README.zh-CN.md)

A self-hosted admin console and API for connecting WeChat iLink accounts, managing conversations, and forwarding incoming messages to your service.

## What it does

- Register and sign in with an email address and password.
- Connect or reconnect WeChat accounts by scanning a QR code. Start, stop, and delete stopped accounts.
- Manage conversations and send text, images, videos, and files. Images and videos can be previewed in chat.
- Forward `message.received` events to your webhook endpoint with an HMAC-SHA256 signature, and inspect delivery records.
- View account and webhook status on the dashboard. The interface supports Simplified Chinese and English.

The project is a pnpm/Turborepo workspace. The API uses AdonisJS, and the admin console uses React. SQLite is the current database.

## Run locally

### Requirements

- Node.js `24.15.0` (see `.nvmrc`)
- pnpm `10.15.1` (pinned in the root `package.json`)

From the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm --filter @wechat-ilink/backend exec node ace generate:key
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173), create your user at `/sign-up`, then scan a QR code from **Accounts**. The `.env.example` files provide the local defaults; keep the generated `APP_KEY` private and do not commit `.env` files.

The frontend proxies `/api` to the backend at `http://localhost:3333`. The API reference is at [http://localhost:3333/docs](http://localhost:3333/docs), and the health endpoint is [http://localhost:3333/health](http://localhost:3333/health).

## Configuration and data

- `apps/backend/.env`: `APP_KEY` is required. The `ILINK_*` values in `.env.example` configure the iLink client and service endpoints. `MEDIA_STORAGE_PATH` defaults to `data/media` relative to the backend app.
- `apps/frontend/.env`: `VITE_API_URL` defaults to `/api/v1`, which works with the local Vite proxy and same-origin deployments.
- The SQLite database is `apps/backend/tmp/db.sqlite3`. Outbound media is stored under `apps/backend/data/media` by default. Back up both when preserving application data.
- SQLite and local media storage are configured for a single backend instance. See the [deployment guide](docs/deployment.md) before running this in production.

## Development

Run the full local quality gate with:

```sh
pnpm check
```

Frontend browser tests use Playwright Chromium. See the [development guide](docs/development.md) for first-time browser setup, individual checks, and release steps.

## Documentation

- [WeChat iLink API reference](docs/weixin-api.md)
- [Development guide](docs/development.md)
- [Deployment guide](docs/deployment.md)
- [Backend workspace](apps/backend/README.md) · [Frontend workspace](apps/frontend/README.md)
