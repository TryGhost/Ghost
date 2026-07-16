# i18n review

Advisory CI tool that posts a non-approving GitHub review on Ghost
translation PRs.

Triggered by `.github/workflows/translation-review.yml` when the `affects:i18n`
label is applied to a PR. Reads the PR's changes to `packages/i18n/locales/**/*.json`,
asks Claude to validate the translations against the English source and
`context.json`, and posts the result as a `COMMENT`-event review. The bot
cannot approve PRs and the review never blocks merge — a maintainer still
owns the merge decision.

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
