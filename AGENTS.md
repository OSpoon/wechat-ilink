# Project Engineering Rules

This repository is a pnpm/Turborepo monorepo with an AdonisJS API in
`apps/backend` and the React admin template in `apps/frontend`. The frontend is
based on `satnaing/shadcn-admin`; SQLite is the current persistence layer.

## Instruction Priority and Scope

- System and explicit user instructions take precedence over this file.
- This file is the project-wide source of engineering rules. A closer
  `AGENTS.md` may add rules but must not weaken these requirements.
- Read this file and the closest app-level `AGENTS.md` before editing. Inspect
  nearby implementations, tests, and API contracts; preserve unrelated work.
- Keep the upstream admin template's pages, interactions, and reusable UI as
  the default. Extend its existing patterns; remove or replace template
  capabilities only when the user asks.

## Backend, API, and Data Safety

- The backend is authoritative for authentication, validation, and persisted
  state. Never rely on frontend checks to protect an API operation.
- Keep API routes under `/api/v1`, validate input with VineJS, and protect
  account data with the existing authentication middleware.
- Return only fields needed by clients. Do not expose passwords, access tokens,
  hashes, or other secrets in ordinary responses or logs.
- Add a migration for each schema change. Never edit a migration that may
  already have been applied. Keep demo seeds safe to rerun.
- Tests must use an isolated test database. Never point tests at the developer
  database or production data.

## Implementation Workflow

- Use pnpm at the repository root; keep the lockfile in sync with manifest
  changes. Use the Node version in `.nvmrc`.
- Prefer existing app services, API clients, shared components, and upstream
  template conventions over parallel implementations.
- Keep changes focused. Update the relevant docs when setup, checks, data
  behavior, or deployment instructions change.
- Do not commit `.env` files, credentials, SQLite databases, dependency trees,
  or generated build output.

## Verification

Run the checks that cover the changed code. The complete local gate is:

```sh
pnpm lint:check
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

Frontend tests use Playwright Chromium. Install it once with
`pnpm --filter @asa/frontend test:browser:install` when needed.
Report failed or skipped checks accurately.

## Git and Delivery

- Use Conventional Commit subjects: `type(scope): imperative summary`.
- Use `pnpm release` to bump workspace versions and generate
  `CHANGELOG.md`. Review generated entries, and do not edit them by hand.
- Keep commits focused; do not stage build output or local configuration.
- Include the generated `CHANGELOG.md` with its corresponding release version.
- Before finishing, inspect `git status` and `git diff --check`.
- Final summaries identify changed behavior and files, checks actually run,
  failures or omissions, and any remaining external setup.
