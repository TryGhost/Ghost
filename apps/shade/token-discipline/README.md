# Shade Token Discipline Config

This directory contains tracked config for the Shade token-discipline gate.

- `baseline.json`: line-level baseline snapshot used for no-new regression checks.
- `allowlist.json`: approved exemptions with required rationale metadata.

These files are consumed by:

```bash
yarn workspace @tryghost/shade token-discipline:report
yarn workspace @tryghost/shade token-discipline:check
yarn workspace @tryghost/shade token-discipline:check:strict
```

## CI enforcement policy

- `token-discipline:check` (used by `lint`) runs in `no-new` mode:
  - blocks new `raw_hex`, `palette_class`, and `arbitrary_utility` findings
  - compares against `baseline.json`
- `token-discipline:check:strict` is the post-migration target:
  - blocks any non-allowlisted finding in scope
  - does not depend on `baseline.json`

## Local workflow

- Use `token-discipline:report` for a current snapshot while refactoring.
- Use `token-discipline:check:strict` before policy flips to understand remaining strict-mode debt.
- Keep `allowlist.json` limited to long-term exemptions (brand assets and third-party constraints), each with explicit `owner`, rationale, and milestone review.
