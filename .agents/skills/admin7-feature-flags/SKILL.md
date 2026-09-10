---
name: admin7-feature-flags
description: Add, consume, review, or remove Admin 7 milestone flags using the shared Admin resolver and Shade feature contract.
---

# Admin 7 milestone flags

Read the canonical [Admin 7 milestone convention](../../../docs/practices/feature-flags.md#admin-7-milestones)
before changing a milestone's gating or introducing another Admin 7 flag.

1. Inspect the [Admin 7 module](../../../apps/admin/src/admin7/) and the existing
   milestone. Identify whether the change belongs to flag resolution, shared
   Shade presentation, or page structure before adding a check.
2. Follow the guide's resolution and removal contract. For a new Labs key, also
   use [Add private feature flag](../add-private-feature-flag/SKILL.md) for its
   registration and settings integration.
3. Verify the affected rollout boundaries using the guide's focused testing
   policy, and report which off/on states were checked. Update the canonical
   guide if the convention changes; keep design-specific rules in Storybook.
