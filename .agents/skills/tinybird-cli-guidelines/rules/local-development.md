# Tinybird Local Development

## Overview

- Tinybird Local runs as a Docker container managed by the Tinybird CLI.
- In CLI 4.0, `tb build` uses `dev_mode` from `tinybird.config.json`.
- Use Tinybird Local for fast local iteration (`dev_mode=local`), then deploy with `tb deploy`.

## Commands

- `tb local start`
  - Options: `--use-aws-creds`, `--volumes-path <path>`, `--skip-new-version`, `--user-token`, `--workspace-token`, `--daemon`.
- `tb local stop`
- `tb local restart`
  - Options: `--use-aws-creds`, `--volumes-path`, `--skip-new-version`, `--yes`.
- `tb local status`
- `tb local remove`
- `tb local version`
- `tb local generate-tokens`

Notes:

- If you remove the container without a persisted volume, local data is lost.
- Manual flags (`--local`, `--cloud`, `--branch`) still work as overrides.

## Local-First Workflow

1. `tb local start`
2. Set `dev_mode` to `local` in `tinybird.config.json`
3. Run `tb dev` in a new terminal — watches for file changes and auto-rebuilds
4. Test endpoints/queries locally with `tb endpoint data <pipe_name>`
5. Run `tb deploy` only when user explicitly requests production deployment

Use `--volumes-path` to persist data between restarts.

`tb dev` is the recommended development command. It watches your project files and automatically rebuilds Data Sources and Endpoints when changes are detected.

## Connecting to the Tinybird UI

- `tb dev --ui`: Builds in watch mode and connects the local project to the Tinybird UI for visual exploration and debugging.
- `tb open`: Opens the workspace in the browser.

These are useful for visually inspecting query results, exploring Data Source schemas, or debugging pipe logic.

## Troubleshooting

- If status shows unhealthy, run `tb local restart` and re-check.
- If authentication is not ready, wait or restart the container.
- If memory warnings appear in status, increase Docker memory allocation.
- If Local is not running, start it with `tb local start`.
