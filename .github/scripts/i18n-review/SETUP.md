# Translation review bot — setup

This is the deployment + operations guide for the agentic translation review
that posts an advisory (non-approving) GitHub review on PRs labelled `affects:i18n`.

For the design rationale and how the code is organised, see `README.md`.

## 1. Add the API key

The workflow needs a single new secret in *Settings → Secrets and variables → Actions*:

| Secret | Value | Scope |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console API key | Repository |

No other workflow currently uses Anthropic, so this is a fresh secret on
`TryGhost/Ghost`. Once it's added, no further setup is required — the
workflow file (`.github/workflows/translation-review.yml`) is already in
place.

### Cost expectations

Defaults to **`claude-sonnet-4-6`**. Each PR run sends roughly
20k–60k input tokens (English source + `context.json` + the locale file's
current contents + the diff) and produces a few hundred output tokens.
That works out to roughly **$0.05–0.30 per PR** at current pricing.

Haiku 4.5 is roughly 3× cheaper at similar quality for this kind of
structured pattern-matching task. To switch the default permanently, edit
the workflow:

```yaml
- name: Run review
  working-directory: .github/scripts/i18n-review
  env:
    # ...existing env...
    ANTHROPIC_MODEL: claude-haiku-4-5
```

For a one-off comparison (Sonnet vs. Haiku on the same PR), use the
**`model`** input on `workflow_dispatch` — see §3.

No code change required — the model is read from `ANTHROPIC_MODEL` and falls
back to the Sonnet default if unset.

## 2. What fires the workflow

The workflow runs on three events, all gated on `affects:i18n`:

| Event | Trigger | Notes |
|---|---|---|
| `pull_request_target.labeled` | When a maintainer adds the `affects:i18n` label | The most common path. Fires once per label-add. |
| `pull_request_target.synchronize` | When new commits are pushed to a PR that already has the label | The bot re-runs and posts a fresh advisory review. Prior runs are not auto-deleted — GitHub does not allow deleting a submitted review. |
| `workflow_dispatch` | Manual run from the Actions tab with PR number + optional model override | Used to retroactively review existing PRs (see §3) or to A/B compare models. |

Concurrency is set to `cancel-in-progress` per PR, so rapid pushes only
result in one live run reviewing the latest commit.

## 3. Retroactively review existing labelled PRs

PRs that already have the `affects:i18n` label when this workflow lands
**will not auto-trigger** — GitHub doesn't replay the `labeled` event.
They'll start being reviewed when:

- A new commit is pushed (fires `synchronize`), or
- A maintainer removes and re-adds the label, or
- A maintainer kicks them off manually.

To kick one off manually:

1. Go to *Actions → Translation Review*
2. Click *Run workflow*
3. Enter the PR number
4. (Optional) pick a `model` to override the default — leave blank to use
   the workflow's configured default. Useful for comparing Sonnet vs.
   Haiku output on the same PR.
5. Click *Run workflow*

The advisory review appears on the PR within ~1 minute.

## 4. Verify it's working

After adding the secret, the easiest end-to-end check is to use
`workflow_dispatch` on an open translation PR (e.g. one from
`affects:i18n` label search). What you should see:

1. Workflow run completes in ~30–60 seconds.
2. A new review appears on the PR, attributed to `github-actions`, with
   state **`COMMENTED`** (not `APPROVED` / `CHANGES_REQUESTED`).
3. The review body opens with **`Verdict:` ✅ Looks good** or
   **`Verdict:` ⚠️ Has questions**.
4. If verdict is `questions`, there are inline comments on the flagged lines.
5. The review never blocks merge. The bot's `GITHUB_TOKEN` cannot approve
   PRs, and a `COMMENT`-event review carries no approval/changes-requested
   signal — it's purely advisory.

If the run fails, check the workflow logs for the failing step. The most
likely causes:

- `ANTHROPIC_API_KEY` not set or invalid → first run fails on the
  `Run review` step with an Anthropic authentication error.
- Model unavailable → set `ANTHROPIC_MODEL` to a dated alias like
  `claude-sonnet-4-6-20251201`.
- Diff position mismatch → if the model references positions that no
  longer match the PR's current head (because new commits arrived between
  analysis and posting), the offending comments are dropped with a warning
  and the rest of the review still posts.

## 5. Tuning the reviewer's behaviour

Everything that controls *what* the model checks lives in **`prompt.md`**.
Edit and PR like any other code change — no workflow edit needed.

Common tunings:

- **Add a new Ghost-specific rule** (e.g. a new placeholder pattern):
  add a short paragraph to the appropriate section of `prompt.md`.
- **Change verdict bias** (when in doubt, ⚠️ vs. ✅): edit the "Verdict"
  section of `prompt.md`. Default is biased toward ✅.
- **Change severity icons**: edit `formatCommentBody` in `src/github.js`.
- **Change the review preamble**: edit `formatReviewBody` in
  `src/github.js`.

The structured-output schema (`REVIEW_TOOL` in `src/analyzer.js`) is the
contract between the model and the poster — only change it if you're
adjusting what fields the review carries.

## 6. Disable temporarily

If the bot starts misbehaving and you want to mute it without reverting:

- *Settings → Actions → General → Disable actions* (nuclear)
- Or comment out the trigger block in `translation-review.yml` and PR
- Or simply rename the `affects:i18n` label — the conditional won't match

The bot only ever posts advisory `COMMENT`-event reviews; it cannot
approve a PR or block a merge, so disabling it is always safe.

## 7. Local development / debugging

```bash
cd .github/scripts/i18n-review
npm install
GITHUB_TOKEN=ghp_... \
  ANTHROPIC_API_KEY=sk-ant-... \
  GITHUB_OWNER=TryGhost \
  GITHUB_REPO=Ghost \
  DEBUG=true \
  node index.js 27780 --dry-run
```

`--dry-run` prints the structured review payload to stdout without posting
to GitHub. `DEBUG=true` also dumps the user message sent to Claude to
stderr so you can iterate on the prompt locally.

Once the payload looks right, drop `--dry-run` to actually post the
review (you'll need a token with `pull_request: write` for the target PR).
Set `ANTHROPIC_MODEL=claude-haiku-4-5` (or any other model id) to override
the default for a local run.
