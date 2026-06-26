# Workflows

How we write GitHub Actions workflows safely. Follow these when adding or editing anything in this directory.

## Token permissions

- **Every workflow declares a top-level `permissions:` block, defaulting to `contents: read`.** This is the floor. A compromised dependency or action in a build/test job cannot push code, publish packages, or comment on issues.
- **Escalate at the job level, never the top level.** A job-level `permissions:` block fully replaces the default for that job, so grant the extra scope only to the specific job that needs it:
  - posts a PR comment → `pull-requests: write`
  - publishes packages → `packages: write`
  - pushes commits / creates releases → `contents: write`
  - authenticates via OIDC → `id-token: write`
- **New jobs start with no extra scope.** Because the default is read-only, an under-scoped job fails loudly rather than running over-privileged. Add only the scope that fails.
- **Prefer a PAT, deploy key, or OIDC over widening `GITHUB_TOKEN`.** Cross-repo dispatch and releases use dedicated credentials, so those jobs keep `contents: read`.

`permissions:` scopes the `GITHUB_TOKEN` only. It does not protect secrets and does not prevent code from running — it caps the damage of a stolen token, it does not make a job safe.

## Untrusted input

- **Use `pull_request`, not `pull_request_target`.** Fork PRs then run with a read-only token and no access to secrets. Only use `pull_request_target` when you fully control what it runs, and never check out and execute untrusted code under it.
- **Never interpolate `${{ github.event.* }}` into a `run:` block.** PR titles, branch names, and bodies are attacker-controlled and lead to shell injection. Pass them through `env:` and reference the variable instead:

  ```yaml
  # Bad — injectable
  run: echo "${{ github.event.pull_request.title }}"

  # Good
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "$PR_TITLE"
  ```

## Secrets

- Expose a secret only to the job that uses it. Do not make secrets available to jobs that run untrusted code.
- Prefer OIDC (`id-token: write`) over long-lived stored secrets where the provider supports it.

## Supply chain

- **Pin every third-party action to a full commit SHA**, with the version as a trailing comment:

  ```yaml
  uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
  ```

  A tag or branch ref can be re-pointed at malicious code; a SHA cannot.
- Install with a frozen lockfile (`pnpm install --frozen-lockfile`).

## Checklist for a new workflow

1. Top-level `permissions: { contents: read }`.
2. Job-level overrides only where a job needs more.
3. Trigger is `pull_request` unless `pull_request_target` is genuinely required and safe.
4. No `${{ github.event.* }}` inside `run:`.
5. Third-party actions pinned to SHAs.
6. Secrets scoped to the jobs that use them.
