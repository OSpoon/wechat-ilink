# 前端

[English](README.md) | [简体中文](README.zh-CN.md)

基于 [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) 的 React 管理仪表盘，属于 pnpm/Turborepo workspace。

管理控制台提供实时微信仪表盘、聊天、账号、Webhook 投递记录，以及账户资料和外观设置。功能通过本地 AdonisJS API 和已配置的 iLink 服务提供。所有账户均使用 AdonisJS 邮箱和密码登录。

## 开发

在仓库根目录运行：

```sh
pnpm install
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

Vite 运行在 `http://localhost:5173`，并将 `/api` 代理到 `http://localhost:3333` 上的 AdonisJS 服务。在 `/sign-up` 创建账户；用户记录和 access token 通过后端 SQLite 数据库保存。

在 `apps/frontend/.env` 中设置 `VITE_API_URL` 可覆盖 API 基础 URL。默认 `/api/v1` 适用于本地 Vite 代理和同源部署。

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
