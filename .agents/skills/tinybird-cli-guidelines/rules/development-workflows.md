# Development Workflows

Tinybird supports three development workflows. Choose based on your team size, infrastructure, and iteration speed needs.

## Workflow Comparison

| Workflow                   | Best for                                    | Requires        | Data                          |
| -------------------------- | ------------------------------------------- | --------------- | ----------------------------- |
| Local (`dev_mode=local`)   | Solo dev, fast iteration, offline work      | Docker          | Fixtures or manually appended |
| Branch (`dev_mode=branch`) | Team collaboration, production-like testing | Cloud workspace | Optional copy from production |
| Cloud direct               | Simple projects, quick prototyping          | Cloud workspace | Production data               |

## Recommended: Branch Workflow

For most projects, use `dev_mode=branch`. It provides isolated environments backed by Tinybird Cloud, with optional access to production data.

```json
{
  "dev_mode": "branch"
}
```

1. Create a git branch for your feature
2. Run `tb dev` — a Cloud branch is created automatically from the git branch name, file changes are watched and auto-rebuilt
3. Develop and test: `tb endpoint data <pipe_name>`
4. Push, create PR — CI runs `tb --cloud deploy --check`
5. Merge — CD runs `tb --cloud deploy`

See `rules/branch-development.md` for details on branch tokens and `--last-partition`.

## Local Workflow

Use `dev_mode=local` for fast iteration without network dependencies. Good for developing SQL logic and testing with fixture data.

```json
{
  "dev_mode": "local"
}
```

1. Start Tinybird Local: `tb local start`
2. Run `tb dev` in a new terminal — watches files and auto-rebuilds
3. Append test data: `tb datasource append <name> --file fixtures/<name>.ndjson`
4. Test endpoints: `tb endpoint data <pipe_name>`
5. Deploy when ready: `tb --cloud deploy`

See `rules/local-development.md` for Tinybird Local commands and troubleshooting.

## Cloud Direct Workflow

For simple projects or quick prototyping, you can work directly against Cloud. Use `tb --cloud deploy` to deploy, or the two-step process for explicit confirmation:

```
tb --cloud deployment create --wait
tb --cloud deployment promote
```

Or the combined shorthand:

```
tb --cloud deploy
```

## Choosing a Workflow

- **Starting a new project?** Start with Local for fast bootstrapping, switch to Branch when you need production data or team collaboration.
- **Team project with shared workspace?** Use Branch. Each developer gets an isolated environment.
- **Quick prototype or demo?** Cloud direct is fine.
- **CI/CD pipeline?** Use Tinybird Local for CI build/test, then `tb --cloud deploy` for production. See `rules/ci-cd.md`.

## Testing Endpoints

Use `tb endpoint data` to test endpoint output:

```
tb endpoint data my_endpoint
tb endpoint data my_endpoint --start_date 2024-01-01 --end_date 2024-01-31
```

Use `tb endpoint data`, not `tb pipe data`. The `endpoint data` command calls the endpoint as an API consumer would, including parameter validation and output formatting.
