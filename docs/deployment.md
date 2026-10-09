# Deployment

[English](deployment.md) | [简体中文](deployment.zh-CN.md)

The repository provides a Docker Compose deployment for a single backend
replica and a static frontend. The backend uses SQLite, so the deployment
mounts a named volume at `/app/tmp` and runs database migrations at startup.

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
curl -fsSL https://raw.githubusercontent.com/OSpoon/adonisjs-shadcn-admin/main/deploy/install.sh | sh
```

It downloads the Compose configuration, creates `.env` with a generated
`APP_KEY`, pulls the images, and starts both services. It installs under
`/opt/asa` when run as root, or `~/asa` otherwise. Set first-install options
on the `sh` side of the pipe, for example:

```sh
curl -fsSL https://raw.githubusercontent.com/OSpoon/adonisjs-shadcn-admin/main/deploy/install.sh | ASA_HTTP_PORT=8081 sh
```

`ASA_INSTALL_DIR`, `ASA_HTTP_PORT`, `ASA_APP_URL`, `ASA_IMAGE_TAG`, and
`ASA_IMAGE_NAMESPACE` change the install path, public URL, port, and image selection.
When setting an image tag, the installer downloads Compose files from that
same tag. Set `ASA_CONFIG_REF` only when the config ref needs to differ from
the image tag. The installer preserves an existing `.env` when rerun.

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
- `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to enable the optional Clerk provider
- `CLERK_AUTHORIZED_PARTIES` to the public frontend origin, for example `https://admin.example.com`

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
deployment with data you need. SQLite is intended here for one backend replica
with persistent local storage. Do not scale the backend across hosts or
containers sharing a network filesystem.

Back up the database regularly using SQLite's online backup mechanism or a
quiesced volume snapshot, and store backups outside the host. Verify restore
procedures before relying on a backup. The application does not automatically
seed demo records in production.

## Updates and remaining host setup

After a release tag is pushed and images are published, update `IMAGE_TAG` on
the host and run `docker compose pull` followed by `docker compose up -d`.
Migrations run before the backend starts. Image publication is automated;
remote host rollout is intentionally not wired until a deployment host and
credentials are selected.
