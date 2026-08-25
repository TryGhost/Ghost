---
name: add-private-feature-flag
description: Use when adding a new private (developer experiments) feature flag to Ghost, including the backend registration and settings UI toggle.
---

# Add Private Feature Flag

## Overview

Adds a new private feature flag to Ghost. Private flags appear in Labs settings under the "Private features" tab, visible only when developer experiments are enabled.

Read and follow the canonical [feature flag guide](../../../docs/practices/feature-flags.md)
before adding a flag. The guide covers when a Labs flag is appropriate, safe
gating across server and Admin, testing, and the cleanup lifecycle.

## Steps

1. **Add the flag to `ghost/core/core/shared/labs.js`**
   - Add the flag name (camelCase string) to the `PRIVATE_FEATURES` array.

2. **Add a UI toggle in `apps/admin/src/settings/advanced/labs/private-features.tsx`**
   - Add a new entry to the `features` array with `title`, `description`, and `flag` (must match the string in `labs.js`).

3. **Run tests and update the config API snapshot**
   - Unit: `cd ghost/core && pnpm test:single test/unit/shared/labs.test.js`
   - Update snapshots: `cd ghost/core && pnpm test:single test/e2e-api/admin/config.test.js -u && pnpm test:single test/e2e-api/admin/settings.test.js -u`
   - Review both snapshot diffs to confirm only your new flag was added.

## Notes

- No database migration is needed. Labs flags are stored in a single JSON `labs` setting.
- The flag name must be identical in `labs.js`, `private-features.tsx`, and the snapshots.
- Flags are camelCase strings (e.g. `welcomeEmailDesignCustomization`).
- For public beta flags (visible to all users), add to `PUBLIC_BETA_FEATURES` in `labs.js` instead and add the toggle to `apps/admin/src/settings/advanced/labs/beta-features.tsx`.
