# 后端

[English](README.md) | [简体中文](README.zh-CN.md)

供 React 管理前端使用的 AdonisJS API，提供认证和仪表盘数据接口，并通过 Lucid migrations 使用 SQLite 持久化数据。

完整项目设置请先阅读[根目录 README](../../README.zh-CN.md)和[开发指南](../../docs/development.zh-CN.md)。后端专属约束见 [AGENTS.md](AGENTS.md)。

## 本地设置

在仓库根目录运行命令。将 `apps/backend/.env.example` 复制为 `apps/backend/.env`，生成应用密钥并设置为 `APP_KEY`：

```sh
cp apps/backend/.env.example apps/backend/.env
pnpm --filter @asa/backend exec node ace generate:key
```

应用迁移，可选地载入演示数据，然后启动 workspace：

```sh
pnpm --filter @asa/backend db:migrate
pnpm --filter @asa/backend db:seed
pnpm dev
```

API 监听 `http://localhost:3333`。开发数据库为 `apps/backend/tmp/db.sqlite3`；测试使用独立的 `apps/backend/tmp/db.test.sqlite3`。

## 配置

| 变量                       | 用途                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `APP_KEY`                  | AdonisJS 必需的加密密钥。每个环境都应生成私有密钥。                                  |
| `HOST`、`PORT`、`APP_URL`  | 绑定地址、端口和应用 URL。默认值为 `localhost`、`3333` 和 `http://localhost:3333`。  |
| `LOG_LEVEL`                | 应用日志详细级别。                                                                   |
| `SESSION_DRIVER`           | 会话存储驱动；本地开发默认使用 `cookie`。                                            |
| `CORS_ORIGIN`              | 可选的跨域前端来源白名单。                                                           |
| `CLERK_SECRET_KEY`         | 可选的 Clerk Backend API 密钥，用于验证 Clerk 会话并关联本地用户。                   |
| `CLERK_AUTHORIZED_PARTIES` | 可选的前端来源列表，逗号分隔；会与 Clerk token 的 `azp` claim 比对。生产环境应配置。 |

本地和单容器部署均使用 SQLite。数据库路径定义在 `config/database.ts`；测试模式会自动使用隔离的测试数据库。

## API 概览

| 功能     | 路由                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 健康检查 | `GET /health`                                                                                                                           |
| 认证     | `POST /api/v1/auth/signup`、`POST /api/v1/auth/login`                                                                                   |
| 账户     | `GET /api/v1/account/profile`、`POST /api/v1/account/logout`、`GET /api/v1/account/settings`、`PATCH /api/v1/account/settings/:section` |
| 任务     | `GET/POST /api/v1/tasks`、批量创建/更新/删除，以及单项更新/删除                                                                         |
| 用户目录 | `GET/POST /api/v1/directory-users`、邀请、批量更新/删除，以及单项更新/删除                                                              |
| 集成     | `GET /api/v1/integrations`、`PATCH /api/v1/integrations/:name`                                                                          |
| 聊天     | `GET/POST /api/v1/chats`、`POST /api/v1/chats/:id/messages`                                                                             |
| 仪表盘   | `GET /api/v1/dashboard`                                                                                                                 |

AdonisJS 注册和登录会返回 access token。受保护路由接受此 token；配置 Clerk 后，也接受经过验证的 Clerk session token。Clerk 身份通过 Clerk 用户 ID 关联到本地 `users` 记录；已验证的主邮箱可用于关联现有本地账户。Seeder 写入的目录记录、集成、任务和会话均为演示数据；集成状态不会配置外部服务或发送邮件。

## 后端命令

以下命令从仓库根目录运行：

| 命令                                      | 说明                                       |
| ----------------------------------------- | ------------------------------------------ |
| `pnpm --filter @asa/backend dev`          | 仅启动带热重载的 API。                     |
| `pnpm --filter @asa/backend db:migrate`   | 应用 SQLite 迁移。                         |
| `pnpm --filter @asa/backend db:seed`      | 向空表载入演示记录。                       |
| `pnpm --filter @asa/backend test`         | 使用隔离的测试数据库运行后端测试。         |
| `pnpm --filter @asa/backend typecheck`    | 生成 AdonisJS 类型并运行 TypeScript 检查。 |
| `pnpm --filter @asa/backend lint:check`   | 运行 ESLint，并将警告视为错误。            |
| `pnpm --filter @asa/backend format:check` | 检查格式但不修改文件。                     |
| `pnpm --filter @asa/backend build`        | 构建生产版 API。                           |

根目录的 `pnpm check` 会运行完整 workspace 检查流程。
