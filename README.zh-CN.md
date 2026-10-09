# WeChat iLink

[English](README.md) | [简体中文](README.zh-CN.md)

WeChat iLink 是基于 AdonisJS、React 和 SQLite 构建的消息 API 与管理控制台。项目使用 pnpm workspace，并由 Turborepo 管理；React 前端在 [shadcn-admin](https://github.com/satnaing/shadcn-admin) 基础上扩展。

## 功能

- 管理控制台提供微信账号、聊天、Webhook 投递记录、实时仪表盘、账户资料和外观设置。
- AdonisJS API 提供注册、登录、账户偏好设置和微信 iLink 服务。
- 微信 iLink API 支持扫码绑定多个账号、账号连接控制、消息收发、媒体传输、输入状态和签名 Webhook。
- React 聊天页连接真实微信消息；账号、Webhook、投递记录和运行状态沿用当前管理端的路由、查询与组件模式。
- 使用 Lucid migrations 管理 SQLite 数据。
- 前后端共用 lint、格式、TypeScript、测试和构建检查，并集成 Git hooks 与 GitHub Actions CI。
- 使用 Docker Compose 部署，提供持久化 SQLite 存储和健康检查。

控制台保留当前业务所需的功能：实时账号与 Webhook 仪表盘、微信聊天与账号管理、Webhook 投递记录、账户资料和外观设置。聊天记录和账号数据来自配置的 iLink 服务及本地 SQLite 数据库。

## 快速开始

### 环境要求

- Node.js `24.15.0`
- pnpm `10.15.1`（版本固定在根目录 `package.json` 中）

### 安装与配置

在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

生成后端应用密钥；AdonisJS 会将密钥直接写入 `apps/backend/.env`：

```sh
pnpm --filter @wechat-ilink/backend exec node ace generate:key
```

请勿提交 `.env` 文件或其中的密钥。

创建 SQLite 数据表并启动前后端：

```sh
pnpm --filter @wechat-ilink/backend db:migrate
pnpm dev
```

打开 [http://localhost:5173](http://localhost:5173)，并在 [http://localhost:5173/sign-up](http://localhost:5173/sign-up) 创建账户。Vite 开发服务器会将 `/api` 请求代理到 `http://localhost:3333` 的后端。API 健康检查地址为 [http://localhost:3333/health](http://localhost:3333/health)。

本地数据库位于 `apps/backend/tmp/db.sqlite3`。迁移只创建所需的数据表；项目不会写入示例任务、用户、集成项目或聊天记录。

微信 iLink 连接配置也包含在 `apps/backend/.env.example` 中。请先在前端注册页创建账号并登录，再进入「WeChat Accounts」扫码绑定。API 文档可通过 `/docs` 查看，端点清单见[微信 iLink API 指南](docs/weixin-api.md)。

## 配置

| 文件                 | 设置项                                       | 用途                                                                                  |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/backend/.env`  | `APP_KEY`                                    | AdonisJS 必需的密钥。每个环境都应生成独立密钥。                                       |
| `apps/backend/.env`  | `HOST`、`PORT`、`APP_URL`                    | 后端绑定地址和应用 URL。默认值为 `localhost`、`3333` 和 `http://localhost:3333`。     |
| `apps/backend/.env`  | `LOG_LEVEL`、`SESSION_DRIVER`                | 日志级别和会话存储方式。本地开发由 Vite 代理 API，无需配置跨域来源。                 |
| `apps/backend/.env`  | `ILINK_*`                                    | iLink 协议客户端、连接地址和媒体 CDN 配置；示例文件包含默认值。                       |
| `apps/backend/.env`  | `LIMITER_STORE`、`MEDIA_STORAGE_PATH`        | API 限流存储方式及已发送媒体的本地持久化路径。                                        |
| `apps/frontend/.env` | `VITE_API_URL`                               | API 基础 URL。本地代理和同源部署默认使用 `/api/v1`。                                  |
所有账户均使用 AdonisJS 邮箱和密码认证。

Docker 部署可使用下面的一键安装命令，或参考[手动部署指南](docs/deployment.zh-CN.md)。不要提交环境文件、凭据或本地 SQLite 数据库。

### Docker 一键安装

在已安装 Docker Engine 和 Docker Compose 插件的主机上运行：

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/wechat-ilink/main/deploy/install.sh | sh
```

安装器会下载 Compose 文件、生成私有 `APP_KEY` 并启动前后端。默认端口为 `8080`；以 root 运行时安装到 `/opt/wechat-ilink`，普通用户运行时安装到 `~/wechat-ilink`。GHCR 镜像为公开包，无需登录即可拉取。可在管道中的 `sh` 端设置 `WECHAT_ILINK_APP_URL` 来配置公开站点 URL，例如：

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/wechat-ilink/main/deploy/install.sh | WECHAT_ILINK_APP_URL=https://admin.example.com sh
```

安装选项和更新方法见[部署指南](docs/deployment.zh-CN.md)。

VS Code 项目设置已启用 ESLint 和 Prettier 集成，并通过 `.vscode/` 推荐相关扩展。

## 开发命令

| 命令                                               | 说明                                        |
| -------------------------------------------------- | ------------------------------------------- |
| `pnpm dev`                                         | 以 watch 模式启动前后端。                   |
| `pnpm check`                                       | 运行 lint、格式、类型、测试和生产构建检查。 |
| `pnpm --filter @wechat-ilink/backend db:migrate`            | 应用本地数据库迁移。                        |
| `pnpm --filter @wechat-ilink/backend typecheck`             | 生成 AdonisJS 类型并检查后端 TypeScript。   |
| `pnpm --filter @wechat-ilink/frontend test:browser:install` | 安装前端浏览器测试所需的 Chromium。         |

后端测试使用独立的 SQLite 数据库 `apps/backend/tmp/db.test.sqlite3`。

## CI 与发布

向 `main` 提交 Pull Request 或推送提交时，GitHub Actions 会运行质量检查。推送 `v*` 标签后，工作流会运行检查、向 GitHub Container Registry 发布前后端镜像，并创建带自动生成说明的 GitHub Release。使用 `pnpm release` 创建版本；检查版本变更和生成的 changelog 后，再推送 release commit 和 tag。工作流不会自动将镜像部署到服务器。

完整流程见[开发与发布指南](docs/development.zh-CN.md)和[部署指南](docs/deployment.zh-CN.md)。

## 项目结构

[后端 workspace](apps/backend/README.zh-CN.md)包含 AdonisJS API、SQLite 迁移和测试。[前端 workspace](apps/frontend/README.zh-CN.md)包含 React 管理控制台。Docker 文件位于 `deploy/`，项目指南位于 `docs/`。

项目级工程约束见 [AGENTS.md](AGENTS.md)，前后端目录还有各自的补充规则。第三方许可文本见 [apps/frontend/LICENSE](apps/frontend/LICENSE)。
