# 前端

[English](README.md) | [简体中文](README.zh-CN.md)

基于 [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) 的 React 管理仪表盘，属于 pnpm/Turborepo workspace。

仪表盘提供个人资料、任务、用户目录、集成、聊天、仪表盘数据和账户偏好页面，数据由本地 AdonisJS API 提供。默认使用 AdonisJS 登录；也可配置前端 publishable key 和后端 secret key，启用可选的 Clerk 登录。`/clerk` 路由提供 Clerk 管理页面，Clerk 登录也可用于主仪表盘 API。Docker 镜像会在容器启动时读取 publishable key。

## 开发

在仓库根目录运行：

```sh
pnpm install
pnpm --filter @asa/backend db:migrate
pnpm dev
```

Vite 运行在 `http://localhost:5173`，并将 `/api` 代理到 `http://localhost:3333` 上的 AdonisJS 服务。在 `/sign-up` 创建账户；用户记录和 access token 通过后端 SQLite 数据库保存。

在 `apps/frontend/.env` 中设置 `VITE_API_URL` 可覆盖 API 基础 URL。默认 `/api/v1` 适用于本地 Vite 代理和同源部署。如需在本地使用 Clerk 登录，请配置 `VITE_CLERK_PUBLISHABLE_KEY`，并在后端环境中设置 `CLERK_SECRET_KEY` 和 `CLERK_AUTHORIZED_PARTIES`。

## Workspace 检查

```sh
pnpm lint:check
pnpm format:check
pnpm typecheck
pnpm build
```

运行 `pnpm format` 可应用项目配置的格式化工具。

## 许可证

此目录包含依据 MIT License 发布的代码。详见 [LICENSE](./LICENSE)。
