# Shade Token Discipline Config

This directory contains tracked config for the Shade token-discipline gate.

- `baseline.json`: line-level baseline snapshot used for no-new regression checks.
- `allowlist.json`: approved exemptions with required rationale metadata.

These files are consumed by:

```bash
yarn workspace @tryghost/shade token-discipline:report
yarn workspace @tryghost/shade token-discipline:check
```
