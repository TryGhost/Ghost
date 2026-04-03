# Shade Token Discipline: Human Checklist

This checklist is for one decision:

Should we switch Shade from **"no new token issues"** to **"strict mode"**?

## What the two modes mean

- **No-new mode (current)**:
  - Existing issues are tolerated.
  - New issues are blocked.
- **Strict mode (target)**:
  - Any non-approved issue is blocked immediately.
  - No baseline file is needed anymore.

## Use this before flipping to strict

### 1) Reality check

- [ ] Run `yarn workspace @tryghost/shade token-discipline:check:strict`
- [ ] It passes on `main` (not just on a feature branch)

If this fails, do not flip yet.

### 2) CI wiring check

- [ ] `apps/shade/package.json` still runs `token-discipline:check` inside `lint`
- [ ] `token-discipline:check` is changed to `--mode strict`
- [ ] `apps/shade/token-discipline/baseline.json` is no longer required by CI

### 3) Exception quality check

- [ ] `allowlist.json` only contains true long-term exceptions:
  - Brand assets (for example social logos)
  - Third-party constraints we cannot control
- [ ] Every exception has:
  - `owner`
  - clear `reason`
  - `review_by_milestone`

### 4) Visual safety check

- [ ] Quick light + dark pass on core shared components (input, tabs, banner, card, dialog, filters, sidebar)
- [ ] No visual regressions introduced by token cleanup

### 5) Team communication check

- [ ] Add a short milestone note: "token discipline moved to strict mode"
- [ ] Include how to fix failures (`yarn workspace @tryghost/shade token-discipline:check:strict`)
- [ ] Assign owner for next allowlist review

## Go / No-Go

- **Go**: all boxes above are checked.
- **No-Go**: keep no-new mode, continue cleanup, retry later.
