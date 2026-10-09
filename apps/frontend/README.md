# Frontend

[English](README.md) | [简体中文](README.zh-CN.md)

React admin dashboard based on [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) in the pnpm/Turborepo workspace.

The dashboard provides pages for profile, tasks, directory users, integrations, chats, dashboard data, and account preferences, backed by the local AdonisJS API. Native AdonisJS sign-in is available by default. Clerk is an optional second provider configured with a frontend publishable key and backend secret key. The `/clerk` routes provide the Clerk management screens, and Clerk login also authenticates the main dashboard APIs. The Docker image reads the publishable key at container startup.

## Development

From the repository root:

```bash
pnpm install
pnpm --filter @asa/backend db:migrate
pnpm dev
```

Vite runs at `http://localhost:5173` and proxies `/api` to the AdonisJS server at `http://localhost:3333`. Create an account from `/sign-up`; user records and access tokens are stored through the backend's SQLite database.

Set `VITE_API_URL` in `apps/frontend/.env` to override the API base URL. The default `/api/v1` works with the local Vite proxy and with deployments that serve the API under the same origin. For local Clerk sign-in, configure `VITE_CLERK_PUBLISHABLE_KEY` and set `CLERK_SECRET_KEY` plus `CLERK_AUTHORIZED_PARTIES` in the backend environment.

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
