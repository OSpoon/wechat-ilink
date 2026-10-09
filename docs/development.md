# Development

[English](development.md) | [简体中文](development.zh-CN.md)

## Requirements

- Node.js `24.15.0` (also recorded in `.nvmrc`)
- pnpm `10.15.1` (pinned by the root `packageManager` field)

Use pnpm from the repository root so the lockfile and workspace remain in
sync.

## First run

```sh
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Generate the backend application key with `pnpm --filter
@wechat-ilink/backend exec node ace generate:key`. AdonisJS writes the key to
`apps/backend/.env`; keep it local and never commit it.

Apply the SQLite migrations and start the applications:

```sh
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

The Vite app runs on `http://localhost:5173` and proxies `/api` to the AdonisJS
server on port `3333`.

## Checks and tests

```sh
pnpm lint:check
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` runs the complete sequence. `pnpm format` applies formatting.
Frontend tests run in Playwright Chromium; install the browser once with:

```sh
pnpm --filter @wechat-ilink/frontend test:browser:install
```

Backend tests migrate and use `apps/backend/tmp/db.test.sqlite3`, separate from
the development database. The checked-in `.env.test` selects a test-only key,
in-memory session and rate-limit stores, a separate HTTP port, and a separate
media directory.

## Release

Use the root `release` command to bump all workspace package versions and
generate `CHANGELOG.md` from Conventional Commits since the previous Git tag:

```sh
pnpm release
```

`bumpp` creates a `chore: release v<version>` commit and an annotated `v`
tag, and synchronizes the lockfile. It does not push. Review the generated
version changes and changelog, then push the release commit and tag to the
configured Git remote:

```sh
git push origin main --follow-tags
```

A pushed `v*` tag runs CI, publishes the backend and frontend images to GitHub
Container Registry, then creates a GitHub Release with automatically generated
release notes. The release is created only after both images publish
successfully. Do not edit generated changelog entries by hand.

## Git hooks

`pnpm install` installs the `simple-git-hooks` hooks. Before a commit, the
pre-commit hook runs lint, formatting, and type checks. The `commit-msg` hook
runs Commitlint with the Conventional Commits configuration in
`.commitlintrc.json`.

Use commit subjects such as `feat(frontend): add account preferences` or
`ci: publish release images`. Keep commits focused and review `git status`
before staging files.
