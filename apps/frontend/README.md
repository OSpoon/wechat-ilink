# Frontend

[English](README.md) | [简体中文](README.zh-CN.md)

React frontend for the WeChat iLink administration console in the pnpm/Turborepo workspace.

It provides the dashboard, chats, WeChat account management, webhooks and delivery records, plus profile and appearance settings. The frontend uses the AdonisJS API and configured iLink service. Users sign in with an email address and password.

## Development

From the repository root:

```bash
pnpm install
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

Vite runs at `http://localhost:5173` and proxies `/api` to the AdonisJS server at `http://localhost:3333`. Create an account from `/sign-up`; user records and access tokens are stored through the backend's SQLite database.

Set `VITE_API_URL` in `apps/frontend/.env` to override the API base URL. The default `/api/v1` works with the local Vite proxy and with deployments that serve the API under the same origin.

## Workspace checks

```bash
pnpm lint:check
pnpm format:check
pnpm typecheck
pnpm build
```

Use `pnpm format` to apply the configured formatters.

## License

This frontend includes code distributed under the MIT License. See [LICENSE](./LICENSE).
