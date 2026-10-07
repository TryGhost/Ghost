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
- **Never pass a secret to a local action (`uses: ./...`) on a `pull_request` run.** A `pull_request` run executes the merge commit (`GITHUB_REF` is `refs/pull/N/merge`), so the workflow file and every local action it calls are PR-authored — an input you pass is an input the PR reads. A guard _inside_ the action is too late; the secret is already an input. Gate it at the caller:

  ```yaml
  # Bad — the PR controls .github/actions/foo/action.yml
  github-token: ${{ secrets.SOME_PAT }}

  # Good — push runs publish, PR runs get an empty string
  github-token: ${{ github.event_name != 'pull_request' && secrets.SOME_PAT || '' }}
  ```

  Fork PRs get no secrets, so this bites on same-repo branches — and there it is damage control rather than a boundary, since anyone who can push a branch can also edit the workflow. What it does buy is that a compromised dependency or third-party action in that job never sees the secret.

- **A secret is exposed to its whole job, not just its step.** Steps share a runner, so PR-authored code running earlier in the job — a repo script, a build, a lifecycle hook — can shadow a binary on `$GITHUB_PATH` or write `$GITHUB_ENV` and capture the secret from a later step. If a job checks out PR code, keep secrets out of it entirely and do the privileged work in a separate job with no checkout.
- Prefer OIDC (`id-token: write`) over long-lived stored secrets where the provider supports it.

## Supply chain

- **Pin every third-party action to a full commit SHA**, with the version as a trailing comment:

  ```yaml
  uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  ```

  A tag or branch ref can be re-pointed at malicious code; a SHA cannot.

- Install with a frozen lockfile (`pnpm install --frozen-lockfile`).

## Checklist for a new workflow

1. Top-level `permissions: { contents: read }`.
2. Job-level overrides only where a job needs more.
3. Trigger is `pull_request` unless `pull_request_target` is genuinely required and safe.
4. No `${{ github.event.* }}` inside `run:`.
5. Third-party actions pinned to SHAs.
6. Secrets scoped to the jobs that use them, and never passed to a local action on a `pull_request` run.
7. No job both checks out PR code and holds a secret.

## PR preview boundary

The preview dispatch workflow reads GitHub metadata only; it never checks out PR
code. Ghost-Moya resolves the image digest, confirms it was built from the PR head,
and builds the preview adapter image and runs
smoke tests on a separate runner with no deployment secrets or OIDC. Publishing
imports image data without running it, and deployment pins the registry digest.
Inherited base-image ONBUILD instructions and adapter validation are PR code too.

## PR preview labels

Either `preview` or `preview:<profile>` enables a preview. A profile label selects
its seed dataset and takes precedence when both forms are present; `preview` alone
uses the default. Only one profile label is allowed at a time.

Removing the last preview label or closing the PR tears down the preview. Changing
the selected profile reseeds its database, discarding any changes made on the site.

Each push to a labelled PR refreshes its preview once CI has published the new
image: the Pro CD dispatch tells Ghost-Moya whether the PR has a preview. A refresh
keeps the database. A failed build leaves the last good deployment running, and a
reopened PR redeploys from its reopen CI run. Fork PRs cannot have previews because
their images are not published to GHCR.

Ghost-Moya re-reads the PR's state, labels and head before changing anything, so a
delayed or superseded request deploys the current head or nothing at all. GitHub
deployments record the commit that was actually deployed.
