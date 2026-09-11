---
name: tinybird-cli-guidelines
description: Tinybird CLI commands, workflows, and operations. Use when running tb commands, managing local development, deploying, or working with data operations.
---

# Tinybird CLI Guidelines

Guidance for using the Tinybird CLI (tb) for local development, deployments, data operations, and workspace management.

## When to Apply

- Running any `tb` command
- Choosing a development workflow (local, branch, or cloud)
- Local development with Tinybird Local
- Branch development with Tinybird Cloud branches
- Building and deploying projects
- Setting up CI/CD pipelines
- Appending, replacing, or deleting data
- Managing tokens and secrets via CLI
- Generating mock data
- Running tests

## Rule Files

- `rules/development-workflows.md`
- `rules/cli-commands.md`
- `rules/build-deploy.md`
- `rules/local-development.md`
- `rules/branch-development.md`
- `rules/ci-cd.md`
- `rules/data-operations.md`
- `rules/append-data.md`
- `rules/mock-data.md`
- `rules/tokens.md`
- `rules/secrets.md`

## Quick Reference

- CLI 4.0 workflow: configure `dev_mode` once, then use plain `tb build` and `tb deploy`.
- `tb build` targets your configured development environment (`branch` or `local`) in tinybird.config.json.
- `tb deploy` targets Tinybird Cloud production.
- Use `--cloud`/`--local`/`--branch` only as explicit manual overrides.
- Use `tb info` to check CLI context.
- Use `tb endpoint data <pipe>` to test endpoints (not `tb pipe data`).
- Never invent commands or flags; run `tb <command> --help` to verify.
