---
name: tinybird-cli-guidelines
description: Tinybird CLI commands, workflows, and operations. Use when running tb commands, managing local development, deploying, or working with data operations.
---

# Tinybird CLI Guidelines

Guidance for using the Tinybird CLI (tb) for local development, deployments, data operations, and workspace management.

## When to Apply

- Running any `tb` command
- Local development with Tinybird Local
- Building and deploying projects
- Appending, replacing, or deleting data
- Managing tokens and secrets via CLI
- Generating mock data
- Running tests

## Rule Files

- `rules/cli-commands.md`
- `rules/build-deploy.md`
- `rules/local-development.md`
- `rules/data-operations.md`
- `rules/append-data.md`
- `rules/mock-data.md`
- `rules/tokens.md`
- `rules/secrets.md`

## Quick Reference

- CLI 4.0 workflow: configure `dev_mode` once, then use plain `tb build` and `tb deploy`.
- `tb build` targets your configured development environment (`branch` or `local`) in tinybird.config.json
- `tb deploy` targets Tinybird Cloud production.
- Use `--cloud`/`--local`/`--branch` only as explicit manual overrides.
- Use `tb info` to check CLI context.
- Never invent commands or flags; run `tb <command> --help` to verify.
