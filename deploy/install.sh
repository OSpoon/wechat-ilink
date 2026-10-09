#!/bin/sh

set -eu

REPOSITORY=OSpoon/adonisjs-shadcn-admin
IMAGE_NAMESPACE=${ASA_IMAGE_NAMESPACE:-ghcr.io/ospoon/adonisjs-shadcn-admin}
IMAGE_TAG=${ASA_IMAGE_TAG:-latest}
HTTP_PORT=${ASA_HTTP_PORT:-8080}
APP_URL=${ASA_APP_URL:-http://localhost:$HTTP_PORT}
CONFIG_REF=${ASA_CONFIG_REF:-${ASA_IMAGE_TAG:-main}}

if [ "$CONFIG_REF" = latest ]; then
  CONFIG_REF=main
fi
RAW_BASE="https://raw.githubusercontent.com/$REPOSITORY/$CONFIG_REF/deploy"

fail() {
  printf 'adonisjs-shadcn-admin installer: %s\n' "$1" >&2
  exit 1
}

case "$IMAGE_NAMESPACE" in
  ''|*[!A-Za-z0-9./:_-]*) fail 'ASA_IMAGE_NAMESPACE contains unsupported characters.' ;;
esac

case "$IMAGE_TAG" in
  ''|*[!A-Za-z0-9_.-]*) fail 'ASA_IMAGE_TAG contains unsupported characters.' ;;
esac

case "$CONFIG_REF" in
  ''|/*|*/|*..*|*[!A-Za-z0-9._/-]*) fail 'ASA_CONFIG_REF contains unsupported characters.' ;;
esac

case "$HTTP_PORT" in
  ''|*[!0-9]*) fail 'ASA_HTTP_PORT must be a number between 1 and 65535.' ;;
esac

[ "$HTTP_PORT" -ge 1 ] && [ "$HTTP_PORT" -le 65535 ] ||
  fail 'ASA_HTTP_PORT must be a number between 1 and 65535.'

if [ -n "${ASA_INSTALL_DIR:-}" ]; then
  INSTALL_DIR=$ASA_INSTALL_DIR
elif [ "$(id -u)" -eq 0 ]; then
  INSTALL_DIR=/opt/asa
else
  INSTALL_DIR="${HOME:-.}/asa"
fi

command -v openssl >/dev/null 2>&1 || fail 'OpenSSL is required to generate APP_KEY.'

if command -v curl >/dev/null 2>&1; then
  fetch_file() {
    curl --fail --silent --show-error --location "$1" --output "$2"
  }
elif command -v wget >/dev/null 2>&1; then
  fetch_file() {
    wget --quiet --output-document="$2" "$1"
  }
else
  fail 'Install curl or wget to download the Compose files.'
fi

if ! command -v docker >/dev/null 2>&1; then
  fail 'Docker Engine and the Docker Compose plugin are required. Install Docker, then rerun this command.'
fi

USE_SUDO=0
if ! docker info >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    USE_SUDO=1
  else
    fail 'Docker is not running or this user cannot access it. Start Docker or grant this user Docker access.'
  fi
fi

run_docker() {
  if [ "$USE_SUDO" -eq 1 ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

run_docker compose version >/dev/null 2>&1 ||
  fail 'The Docker Compose plugin is required. Install it, then rerun this command.'

mkdir -p "$INSTALL_DIR"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' 0
trap 'exit 1' HUP INT TERM

printf 'Downloading adonisjs-shadcn-admin Compose configuration...\n'
fetch_file "$RAW_BASE/compose.yml" "$TEMP_DIR/compose.yml" ||
  fail 'Could not download deploy/compose.yml from GitHub.'
fetch_file "$RAW_BASE/.env.example" "$TEMP_DIR/.env.example" ||
  fail 'Could not download deploy/.env.example from GitHub.'

mv "$TEMP_DIR/compose.yml" "$INSTALL_DIR/compose.yml"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  APP_KEY=$(openssl rand -hex 32) || fail 'Could not generate APP_KEY.'
  awk \
    -v image_namespace="$IMAGE_NAMESPACE" \
    -v image_tag="$IMAGE_TAG" \
    -v http_port="$HTTP_PORT" \
    -v app_key="$APP_KEY" \
    -v app_url="$APP_URL" \
    '
      /^IMAGE_NAMESPACE=/ { print "IMAGE_NAMESPACE=" image_namespace; next }
      /^IMAGE_TAG=/ { print "IMAGE_TAG=" image_tag; next }
      /^HTTP_PORT=/ { print "HTTP_PORT=" http_port; next }
      /^APP_URL=/ { print "APP_URL=" app_url; next }
      /^APP_KEY=/ { print "APP_KEY=" app_key; next }
      { print }
    ' "$TEMP_DIR/.env.example" > "$INSTALL_DIR/.env"
  chmod 600 "$INSTALL_DIR/.env"
  printf 'Created %s/.env with a generated APP_KEY.\n' "$INSTALL_DIR"
else
  printf 'Keeping existing %s/.env.\n' "$INSTALL_DIR"
fi
chmod 600 "$INSTALL_DIR/.env"

cd "$INSTALL_DIR"
printf 'Pulling adonisjs-shadcn-admin images...\n'
if ! run_docker compose --env-file .env -f compose.yml pull; then
  cat >&2 <<EOF
The configured images could not be pulled. Check IMAGE_NAMESPACE, IMAGE_TAG, network connectivity, and registry access.
The Compose files and .env were kept in: $INSTALL_DIR
EOF
  exit 1
fi

printf 'Starting adonisjs-shadcn-admin...\n'
run_docker compose --env-file .env -f compose.yml up -d
run_docker compose --env-file .env -f compose.yml ps

printf '\nadonisjs-shadcn-admin is running on port %s. Review %s/.env to set APP_URL and optional Clerk keys.\n' \
  "$HTTP_PORT" "$INSTALL_DIR"
