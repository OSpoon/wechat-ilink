# adonisjs-shadcn-admin

[English](README.md) | [简体中文](README.zh-CN.md)

一个全栈管理后台起始项目：前端采用 [shadcn-admin](https://github.com/satnaing/shadcn-admin) React 仪表盘，后端使用 AdonisJS API 和 SQLite。项目使用 pnpm workspace，并由 Turborepo 管理。

## 功能

- 管理仪表盘支持响应式侧边栏、命令搜索、主题、RTL 布局、表格、对话框和设置页面。
- AdonisJS API 提供注册、登录、个人资料、任务、用户目录、集成、聊天、仪表盘数据和账户偏好设置。
- 支持可选的 Clerk 登录。API 会验证 Clerk 会话，并将 Clerk 用户关联到 SQLite 用户记录。
- 使用 Lucid migrations 和 seeders 管理 SQLite 数据。
- 前后端共用 lint、格式、TypeScript、测试和构建检查，并集成 Git hooks 与 GitHub Actions CI。
- 使用 Docker Compose 部署，提供持久化 SQLite 存储和健康检查。

仪表盘中的个人资料、任务、用户目录、集成、聊天和账户页面使用本地 API。集成卡片和预置用户数据仅用于演示；点击卡片不会配置外部服务，也不会发送邀请邮件。

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

生成 AdonisJS 应用密钥：

```sh
pnpm --filter @asa/backend exec node ace generate:key
```

将生成的值填入 `apps/backend/.env` 中的 `APP_KEY`。`.env` 文件和其中的密钥只保存在本地。

创建 SQLite 数据表、载入演示数据并启动前后端：

```sh
pnpm --filter @asa/backend db:migrate
pnpm --filter @asa/backend db:seed
pnpm dev
```

打开 [http://localhost:5173](http://localhost:5173)，并在 [http://localhost:5173/sign-up](http://localhost:5173/sign-up) 创建账户。Vite 开发服务器会将 `/api` 请求代理到 `http://localhost:3333` 的后端。API 健康检查地址为 [http://localhost:3333/health](http://localhost:3333/health)。

本地数据库位于 `apps/backend/tmp/db.sqlite3`。seed 命令会添加 100 条任务、500 个目录用户、15 个集成项目和模板聊天记录。只有对应数据表为空时才会写入，因此开发期间可以安全地重复运行。不要在生产数据库中载入演示数据。

## 配置

| 文件 | 设置项 | 用途 |
| --- | --- | --- |
| `apps/backend/.env` | `APP_KEY` | AdonisJS 必需的密钥。每个环境都应生成独立密钥。 |
| `apps/backend/.env` | `HOST`、`PORT`、`APP_URL` | 后端绑定地址和应用 URL。默认值为 `localhost`、`3333` 和 `http://localhost:3333`。 |
| `apps/backend/.env` | `LOG_LEVEL`、`SESSION_DRIVER`、`CORS_ORIGIN` | 日志级别、会话存储方式，以及跨域部署时可选的来源白名单。 |
| `apps/backend/.env` | `CLERK_SECRET_KEY` | 可选的 Clerk Backend API 密钥。配置后，受保护的 API 路由会验证 Clerk 会话。 |
| `apps/backend/.env` | `CLERK_AUTHORIZED_PARTIES` | 可选的前端来源列表，逗号分隔。生产环境应配置此项。 |
| `apps/frontend/.env` | `VITE_API_URL` | API 基础 URL。本地代理和同源部署默认使用 `/api/v1`。 |
| `apps/frontend/.env` | `VITE_CLERK_PUBLISHABLE_KEY` | 可选的 Clerk 前端密钥。与后端密钥一起配置后，可显示 Clerk 登录并通过 Clerk 访问 API。 |

配置好 Clerk 前后端密钥后，登录和注册页面会提供 Clerk 作为可选方式。只有 Clerk 主邮箱已验证时，才会尝试关联现有本地账户；否则会创建 SQLite 用户并关联 Clerk 用户 ID。AdonisJS 邮箱和密码登录仍可用。Docker 部署请在 `deploy/.env` 中配置 `CLERK_PUBLISHABLE_KEY`、`CLERK_SECRET_KEY` 和 `CLERK_AUTHORIZED_PARTIES`。

Docker 部署可使用下面的一键安装命令，或参考[手动部署指南](docs/deployment.zh-CN.md)。不要提交环境文件、凭据或本地 SQLite 数据库。

### Docker 一键安装

在已安装 Docker Engine 和 Docker Compose 插件的主机上运行：

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/adonisjs-shadcn-admin/main/deploy/install.sh | sh
```

安装器会下载 Compose 文件、生成私有 `APP_KEY` 并启动前后端。默认端口为 `8080`；以 root 运行时安装到 `/opt/asa`，普通用户运行时安装到 `~/asa`。GHCR 镜像为公开包，无需登录即可拉取。可在管道中的 `sh` 端设置 `ASA_APP_URL` 来配置公开站点 URL，例如：

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/adonisjs-shadcn-admin/main/deploy/install.sh | ASA_APP_URL=https://admin.example.com sh
```

安装选项和更新方法见[部署指南](docs/deployment.zh-CN.md)。

VS Code 项目设置已启用 ESLint 和 Prettier 集成，并通过 `.vscode/` 推荐相关扩展。

## 开发命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 以 watch 模式启动前后端。 |
| `pnpm check` | 运行 lint、格式、类型、测试和生产构建检查。 |
| `pnpm --filter @asa/backend db:migrate` | 应用本地数据库迁移。 |
| `pnpm --filter @asa/backend db:seed` | 加载开发环境演示数据。 |
| `pnpm --filter @asa/frontend test:browser:install` | 安装前端浏览器测试所需的 Chromium。 |

后端测试使用独立的 SQLite 数据库 `apps/backend/tmp/db.test.sqlite3`。

## CI 与发布

向 `main` 提交 Pull Request 或推送提交时，GitHub Actions 会运行质量检查。推送 `v*` 标签后，工作流会运行检查、向 GitHub Container Registry 发布前后端镜像，并创建带自动生成说明的 GitHub Release。使用 `pnpm release` 创建版本；检查版本变更和生成的 changelog 后，再推送 release commit 和 tag。工作流不会自动将镜像部署到服务器。

完整流程见[开发与发布指南](docs/development.zh-CN.md)和[部署指南](docs/deployment.zh-CN.md)。

## 项目结构

[后端 workspace](apps/backend/README.zh-CN.md)包含 AdonisJS API、SQLite 迁移、seeders 和测试。[前端 workspace](apps/frontend/README.zh-CN.md)是基于 satnaing/shadcn-admin 的 React 管理界面。Docker 文件位于 `deploy/`，项目指南位于 `docs/`。

项目级工程约束见 [AGENTS.md](AGENTS.md)，前后端目录还有各自的补充规则。第三方许可文本见 [apps/frontend/LICENSE](apps/frontend/LICENSE)。
