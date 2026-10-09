# 开发指南

[English](development.md) | [简体中文](development.zh-CN.md)

## 环境要求

- Node.js `24.15.0`（版本也记录在 `.nvmrc` 中）
- pnpm `10.15.1`（由根目录 `package.json` 的 `packageManager` 字段固定）

请在仓库根目录使用 pnpm，以保持 lockfile 与 workspace 配置同步。

## 首次运行

```sh
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

运行 `pnpm --filter @wechat-ilink/backend exec node ace generate:key` 生成后端应用密钥。AdonisJS 会将密钥写入 `apps/backend/.env`；请保存在本地，不要提交。

应用 SQLite 迁移并启动应用：

```sh
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

Vite 前端运行在 `http://localhost:5173`，并将 `/api` 代理到 `3333` 端口上的 AdonisJS 服务。

## 检查与测试

```sh
pnpm lint:check
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` 会按顺序运行完整检查。`pnpm format` 会应用格式化。前端测试使用 Playwright Chromium；首次运行时安装浏览器：

```sh
pnpm --filter @wechat-ilink/frontend test:browser:install
```

后端测试会迁移并使用 `apps/backend/tmp/db.test.sqlite3`，与开发数据库分离。仓库中的 `.env.test` 使用测试专用密钥、内存会话和限流存储、独立 HTTP 端口及媒体目录。

## 发布

运行根目录的 `release` 命令来更新所有 workspace package 版本，并根据上一个 Git tag 之后的 Conventional Commits 生成 `CHANGELOG.md`：

```sh
pnpm release
```

`bumpp` 会创建 `chore: release v<version>` commit 和带注释的 `v` tag，并同步 lockfile，但不会推送。检查生成的版本变更和 changelog 后，将 release commit 与 tag 推送到配置的 Git 远程：

```sh
git push origin main --follow-tags
```

推送 `v*` tag 后，CI 会运行检查并向 GitHub Container Registry 发布前后端镜像，随后创建带自动生成说明的 GitHub Release。只有两个镜像都成功发布后才会创建 Release。不要手动编辑自动生成的 changelog 条目。

## Git hooks

`pnpm install` 会安装 `simple-git-hooks`。提交前，`pre-commit` hook 会运行 lint、格式和类型检查；`commit-msg` hook 会使用 `.commitlintrc.json` 中的 Conventional Commits 配置检查提交说明。

提交说明示例：`feat(frontend): add account preferences` 或 `ci: publish release images`。每个 commit 应保持聚焦，暂存前请检查 `git status`。
