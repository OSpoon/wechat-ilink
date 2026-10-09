# 后端

[English](README.md) | [简体中文](README.zh-CN.md)

供 React 管理前端和业务系统使用的 AdonisJS API，提供认证、账户偏好设置、微信 iLink 扫码登录、账号管理、消息/媒体传输和 Webhook，并通过 Lucid migrations 使用 SQLite 持久化数据。

完整项目设置请先阅读[根目录 README](../../README.zh-CN.md)和[开发指南](../../docs/development.zh-CN.md)。后端专属约束见 [AGENTS.md](AGENTS.md)。

## 本地设置

在仓库根目录复制配置示例并生成后端应用密钥。AdonisJS 会将密钥直接写入 `apps/backend/.env`：

```sh
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm --filter @wechat-ilink/backend exec node ace generate:key
```

应用迁移并启动 workspace：

```sh
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

API 监听 `http://localhost:3333`。开发数据库为 `apps/backend/tmp/db.sqlite3`；测试使用独立的 `apps/backend/tmp/db.test.sqlite3`。

## 配置

| 变量                      | 用途                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `APP_KEY`                 | AdonisJS 必需的加密密钥。每个环境都应生成私有密钥。                                 |
| `HOST`、`PORT`、`APP_URL` | 绑定地址、端口和应用 URL。默认值为 `localhost`、`3333` 和 `http://localhost:3333`。 |
| `LOG_LEVEL`               | 应用日志详细级别。                                                                  |
| `SESSION_DRIVER`          | 会话存储驱动；本地开发默认使用 `cookie`。                                           |
| `ILINK_*`                 | iLink 协议客户端、微信服务地址、CDN 和 bot 类型；示例值见 `.env.example`。          |
| `LIMITER_STORE`           | API 限流使用 `database`（SQLite）或 `memory` 存储。                                 |
| `MEDIA_STORAGE_PATH`      | 已发送媒体文件的持久化目录，默认 `data/media`。                                     |

本地和单容器部署均使用 SQLite。数据库路径定义在 `config/database.ts`；测试模式会自动使用隔离的测试数据库。

## API 概览

| 功能     | 路由                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 健康检查 | `GET /health`                                                                                                                           |
| 认证     | `POST /api/v1/auth/signup`、`POST /api/v1/auth/login`                                                                                   |
| 账户     | `GET /api/v1/account/profile`、`POST /api/v1/account/logout`、`GET /api/v1/account/settings`、`PATCH /api/v1/account/settings/:section` |
| 微信账号 | `/api/v1/weixin/accounts`、`/api/v1/weixin/login-sessions`                                                                              |
| 微信消息 | `/api/v1/weixin/accounts/:accountId/messages`、`/media`、`/typing`                                                                      |
| Webhook  | `/api/v1/weixin/webhooks`、`/api/v1/weixin/webhooks/:webhookId/deliveries`                                                              |

完整的微信 API 调用顺序和请求示例见[微信 iLink API 指南](../../docs/weixin-api.md)，交互式 OpenAPI 文档由 `/docs` 提供。

请在前端注册页或调用 `POST /api/v1/auth/signup` 创建账号，然后登录。注册和登录会返回 access token；受保护路由使用此 token 进行认证。

## 后端命令

以下命令从仓库根目录运行：

| 命令                                               | 说明                                       |
| -------------------------------------------------- | ------------------------------------------ |
| `pnpm --filter @wechat-ilink/backend dev`          | 仅启动带热重载的 API。                     |
| `pnpm --filter @wechat-ilink/backend db:migrate`   | 应用 SQLite 迁移。                         |
| `pnpm --filter @wechat-ilink/backend test`         | 使用隔离的测试数据库运行后端测试。         |
| `pnpm --filter @wechat-ilink/backend typecheck`    | 生成 AdonisJS 类型并运行 TypeScript 检查。 |
| `pnpm --filter @wechat-ilink/backend lint:check`   | 运行 ESLint，并将警告视为错误。            |
| `pnpm --filter @wechat-ilink/backend format:check` | 检查格式但不修改文件。                     |
| `pnpm --filter @wechat-ilink/backend build`        | 构建生产版 API。                           |

根目录的 `pnpm check` 会运行完整 workspace 检查流程。
