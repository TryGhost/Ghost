# i18n review

Advisory CI tool that posts a non-approving GitHub review on Ghost
translation PRs.

Triggered by `.github/workflows/translation-review.yml` when the `affects:i18n`
label is applied to a PR. Reads the PR's changes to `packages/i18n/locales/**/*.json`,
asks Claude to validate the translations against the English source and
`context.json`, and posts the result as a `COMMENT`-event review. The bot
cannot approve PRs and the review never blocks merge — a maintainer still
owns the merge decision.

## Why this isn't a workspace package

Deliberately outside the pnpm workspace, with its own `package-lock.json`, eslint
config and dev deps — don't "clean this up" by folding it in, and don't delete
the lockfile as stray npm cruft.

`translation-review.yml` runs on `pull_request_target`, so it holds
`ANTHROPIC_API_KEY` and a write-scoped token while a PR is in flight. It
sparse-checks-out *only this directory* from `main` and installs only these two
runtime deps, so no PR-controlled code — including a PR-modified lockfile or
lifecycle script — can execute in that context. Making this a workspace member
would drag the root manifests, `pnpm-lock.yaml` and the `preinstall` hook into
that checkout and widen the trusted surface, for no gain: `@anthropic-ai/sdk`
and `@octokit/rest` are needed by CI only, and every Ghost dev would install
them on `pnpm install`.

The cost of that isolation is that the monorepo's `nx run-many -t lint/test`
doesn't reach here, so lint and tests run from their own path-filtered workflow
([i18n-review-checks.yml](../../workflows/i18n-review-checks.yml)) against this
directory's own lockfile.

**Keep the client-injection boundary.** `analyzePR` receives `octokit` and
`anthropic` as arguments rather than constructing them; only `index.js` builds
the real clients. That's what lets the tests run hermetically — no network, no
API key, and `node --test` passes with nothing installed at all. Importing the
SDK directly into `src/` would quietly break that.

## Local use

```bash
cd .github/scripts/i18n-review
npm install
GITHUB_TOKEN=... \
  ANTHROPIC_API_KEY=... \
  GITHUB_OWNER=TryGhost \
  GITHUB_REPO=Ghost \
  node index.js 27780
```

## Files

- `index.js` — CLI entrypoint
- `prompt.md` — system prompt; edit this to tune the reviewer's behaviour
- `src/diff.js` — extracts added lines from a unified diff with both diff
  positions (for the Reviews API) and file line numbers (for sanity)
- `src/analyzer.js` — fetches PR data, calls Claude with a structured-output
  tool, returns review payload
- `src/github.js` — posts the advisory review with inline comments

## Output

One `COMMENT`-event PR review with:

- **Body** opens with `**Verdict:** ✅ Looks good` or `⚠️ Has questions`,
  followed by the model's overall comment
- **Inline comments** on each translation line the model flagged

Repeated runs (e.g. on `synchronize`) post a fresh review each time —
GitHub does not allow deleting submitted reviews, so prior bot reviews
stay on the PR.

## Acknowledgements

Approach and prompt are adapted from
[cathysarisky/i18n_tooling](https://github.com/cathysarisky/i18n_tooling) —
this is a Ghost-owned port with Claude as the backend.
