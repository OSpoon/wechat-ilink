# 部署指南

[English](deployment.md) | [简体中文](deployment.zh-CN.md)

仓库提供 Docker Compose 部署配置，包含一个后端实例和静态前端。后端使用 SQLite，Compose 会将具名卷挂载到 `/app/tmp`，并将已发送媒体持久化到 `/app/data/media`；后端启动前会运行数据库迁移。

## 发布镜像

GitHub Actions 会在向 `main` 推送提交或创建 Pull Request 时运行检查。推送 `v*` tag 并且检查通过后，工作流会向 GitHub Container Registry 发布前后端镜像，并创建带自动生成说明的 GitHub Release：

- `ghcr.io/<owner>/<repository>-backend:<tag>`
- `ghcr.io/<owner>/<repository>-frontend:<tag>`

## 首次部署

在部署主机上安装 Docker Engine 和 Docker Compose 插件。使用默认配置进行免交互安装：

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/wechat-ilink/main/deploy/install.sh | sh
```

安装器会下载 Compose 配置、生成 `APP_KEY`、拉取镜像并启动前后端。root 用户默认安装到 `/opt/wechat-ilink`，普通用户默认安装到 `~/wechat-ilink`。要在首次安装时修改选项，请在管道中的 `sh` 端设置变量，例如：

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/wechat-ilink/main/deploy/install.sh | WECHAT_ILINK_HTTP_PORT=8081 sh
```

`WECHAT_ILINK_INSTALL_DIR`、`WECHAT_ILINK_HTTP_PORT`、`WECHAT_ILINK_APP_URL`、`WECHAT_ILINK_IMAGE_TAG` 和 `WECHAT_ILINK_IMAGE_NAMESPACE` 分别用于设置安装目录、公开 URL、端口和镜像。设置镜像 tag 后，安装器会从同一个 tag 下载 Compose 文件。只有在配置版本需要与镜像 tag 不同时才设置 `WECHAT_ILINK_CONFIG_REF`。再次运行安装器时，现有 `.env` 会保留。

GHCR 镜像为公开包，Docker 无需登录即可拉取。

运行前可先下载并检查仓库中的 `deploy/install.sh`。安装器不会替你安装 Docker。

## 手动部署

将 `deploy/.env.example` 复制为 `deploy/.env`，并设置以下值：

- `IMAGE_NAMESPACE`：小写的 `ghcr.io/<owner>/<repository>` 前缀
- `IMAGE_TAG`：release tag 或 `latest`
- `APP_KEY`：生成的、私有且稳定的 AdonisJS 密钥
- `APP_URL`：公开站点 URL
- `HTTP_PORT`：映射到主机的端口
- `ILINK_*`：按需覆盖 iLink 协议和微信服务地址默认值
- `MEDIA_STORAGE_PATH`：需要自定义媒体持久化路径时设置

拉取镜像并启动服务：

```sh
docker compose --env-file deploy/.env -f deploy/compose.yml pull
docker compose --env-file deploy/.env -f deploy/compose.yml up -d
```

前端负责提供 SPA，并将 `/api/` 代理到后端。对外提供服务时，应将 HTTP 端口放在 TLS 反向代理之后。容器健康检查使用后端 `/health` 和前端 `/healthz`。

## SQLite 操作

`sqlite-data` 具名卷保存生产数据库。重建或更新容器时请保留该卷；如果数据需要保留，不要运行 `docker compose down -v`。同时保留 `media-data` 卷，其中存放可供下载的出站媒体。SQLite 和本地媒体存储适用于单个后端实例，不要在多个主机或共享网络文件系统的容器间扩展后端实例。

请定期使用 SQLite 在线备份机制或停止写入后的卷快照备份数据库，并同时备份 `media-data`，将备份存放在主机之外。正式依赖备份前，应先验证恢复流程。

## 更新与主机设置

推送 release tag 且镜像发布完成后，在主机上更新 `IMAGE_TAG`，再运行 `docker compose pull` 和 `docker compose up -d`。后端启动前会运行迁移。镜像发布已自动化；远程主机自动部署尚未接入，待选定部署主机并配置凭据后再接入。
