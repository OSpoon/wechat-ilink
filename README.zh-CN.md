# WeChat iLink

[English](README.md) | [简体中文](README.zh-CN.md)

一个可自托管的微信 iLink 管理控制台和 API，用于绑定微信账号、管理会话，并将收到的消息转发到你的业务服务。

## 当前功能

- 使用邮箱和密码注册、登录；系统不会预置演示账号。
- 扫码绑定或重新连接微信账号，并支持启动、停止和删除已停止的账号。
- 管理聊天会话，发送文本、图片、视频和文件；图片与视频可在聊天中预览。
- 将 `message.received` 事件通过 HMAC-SHA256 签名投递到 Webhook，并查看投递记录。
- 在仪表盘查看账号和 Webhook 状态。管理界面支持简体中文和英文。

项目使用 pnpm/Turborepo workspace。API 基于 AdonisJS，管理界面基于 React，当前数据库为 SQLite。

## 本地运行

### 环境要求

- Node.js `24.15.0`（见 `.nvmrc`）
- pnpm `10.15.1`（固定在根目录 `package.json` 中）

在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm --filter @wechat-ilink/backend exec node ace generate:key
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

打开 [http://localhost:5173](http://localhost:5173)，访问 `/sign-up` 注册用户，再从「账号」页面扫码绑定微信。`.env.example` 已提供本地默认配置；请妥善保管生成的 `APP_KEY`，不要提交 `.env` 文件。

前端会将 `/api` 代理到 `http://localhost:3333` 的后端。API 文档地址为 [http://localhost:3333/docs](http://localhost:3333/docs)，健康检查地址为 [http://localhost:3333/health](http://localhost:3333/health)。

## 配置与数据

- `apps/backend/.env`：必须配置 `APP_KEY`。`.env.example` 中的 `ILINK_*` 配置 iLink 客户端及服务地址；`MEDIA_STORAGE_PATH` 默认为相对于后端应用目录的 `data/media`。
- `apps/frontend/.env`：`VITE_API_URL` 默认为 `/api/v1`，适用于本地 Vite 代理和同源部署。
- SQLite 数据库位于 `apps/backend/tmp/db.sqlite3`。默认情况下，出站媒体保存在 `apps/backend/data/media`。需要保留数据时请同时备份两者。
- SQLite 和本地媒体存储按单个后端实例配置。生产部署前请阅读[部署指南](docs/deployment.zh-CN.md)。

替换现有微信 iLink 服务时，请参阅[旧服务数据迁移说明](docs/deployment.zh-CN.md#替换旧版微信-ilink-服务)。要保留加密的账号和 Webhook 凭据，必须使用旧服务原来的 `APP_KEY`。

## 开发

运行完整本地检查：

```sh
pnpm check
```

前端浏览器测试使用 Playwright Chromium。首次配置浏览器、运行单项检查和发布的说明见[开发指南](docs/development.zh-CN.md)。

## 文档

- [微信 iLink API 参考](docs/weixin-api.md)
- [开发指南](docs/development.zh-CN.md)
- [部署指南](docs/deployment.zh-CN.md)
- [后端 workspace](apps/backend/README.zh-CN.md) · [前端 workspace](apps/frontend/README.zh-CN.md)
