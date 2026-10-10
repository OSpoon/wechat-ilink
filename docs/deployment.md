# Deployment

[English](deployment.md) | [简体中文](deployment.zh-CN.md)

The repository provides a Docker Compose deployment for a single backend
replica and a static frontend. The backend uses SQLite, so the deployment
mounts a named volume at `/app/tmp`, persists outbound media under
`/app/data/media`, and runs database migrations at startup.

## Publish release images

The GitHub Actions workflow runs checks for pushes and pull requests to
`main`. When a `v*` tag is pushed, it publishes backend and frontend images to
GitHub Container Registry after verification succeeds, then creates a GitHub
Release with generated release notes:

- `ghcr.io/<owner>/<repository>-backend:<tag>`
- `ghcr.io/<owner>/<repository>-frontend:<tag>`

## First deployment

On the deployment host, install Docker Engine and the Docker Compose plugin.
For an interactive-free setup with defaults, run the remote installer:

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/wechat-ilink/main/deploy/install.sh | sh
```

It downloads the Compose configuration, creates `.env` with a generated
`APP_KEY`, pulls the images, and starts both services. It installs under
`/opt/wechat-ilink` when run as root, or `~/wechat-ilink` otherwise. Set first-install options
on the `sh` side of the pipe, for example:

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/wechat-ilink/main/deploy/install.sh | WECHAT_ILINK_HTTP_PORT=8081 sh
```

`WECHAT_ILINK_INSTALL_DIR`, `WECHAT_ILINK_HTTP_PORT`, `WECHAT_ILINK_APP_URL`,
`WECHAT_ILINK_IMAGE_TAG`, and `WECHAT_ILINK_IMAGE_NAMESPACE` change the install
path, public URL, port, and image selection. When setting an image tag, the
installer downloads Compose files from that same tag. Set
`WECHAT_ILINK_CONFIG_REF` only when the config ref needs to differ from the
image tag. The installer preserves an existing `.env` when rerun.

The published GHCR images are public, so Docker can pull them without registry
authentication.

To review the installer before running it, download
`deploy/install.sh` from the repository and inspect it first. The installer
does not install Docker itself.

Copy `deploy/.env.example` to `deploy/.env`, then set:

- `IMAGE_NAMESPACE` to the lowercase `ghcr.io/<owner>/<repository>` prefix
- `IMAGE_TAG` to the release tag, or `latest`
- `APP_KEY` to a generated, private, stable AdonisJS key
- `APP_URL` to the public site URL
- `HTTP_PORT` to the port exposed to the host
- `ILINK_*` to override the iLink protocol and service URL defaults when needed
- `MEDIA_STORAGE_PATH` if outbound media should use a custom persistent path

Start the services:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yml pull
docker compose --env-file deploy/.env -f deploy/compose.yml up -d
```

The frontend serves the SPA and proxies `/api/` to the backend. Put the HTTP
port behind a TLS reverse proxy for public access. The backend `/health` and
frontend `/healthz` endpoints are used by container health checks.

## SQLite operations

The `sqlite-data` named volume is the production database. Keep it when
recreating or updating containers; never run `docker compose down -v` on a
deployment with data you need. Keep the `media-data` named volume as well;
outbound media payloads are stored there for later download. SQLite and local
media storage are intended for one backend replica. Do not scale the backend
across hosts or containers sharing a network filesystem.

Back up the database regularly using SQLite's online backup mechanism or a
quiesced volume snapshot, and back up `media-data` with it. Store backups
outside the host and verify restore procedures before relying on them.

## Updates and remaining host setup

After a release tag is pushed and images are published, update `IMAGE_TAG` on
the host and run `docker compose pull` followed by `docker compose up -d`.
Migrations run before the backend starts. Image publication is automated;
remote host rollout is intentionally not wired until a deployment host and
credentials are selected.
