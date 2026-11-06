#!/usr/bin/env bash
set -euo pipefail

# This project initializes Better Auth during `next build`, but the build does
# not need production credentials or a live database. Override Render's
# runtime variables before dependency lifecycle scripts and the build run.
unset BETTER_AUTH_SECRET DATABASE_URL BETTER_AUTH_URL
build_secret="$(node -p 'require("node:crypto").randomBytes(32).toString("base64url")')"

env \
  BETTER_AUTH_SECRET="$build_secret" \
  DATABASE_URL="postgresql://build:synthetic@127.0.0.1:5432/build" \
  BETTER_AUTH_URL="https://build.invalid" \
  npm ci

env \
  BETTER_AUTH_SECRET="$build_secret" \
  DATABASE_URL="postgresql://build:synthetic@127.0.0.1:5432/build" \
  BETTER_AUTH_URL="https://build.invalid" \
  npm run build

unset build_secret
