---
name: admin7-feature-flags
description: Add, consume, review, or remove Admin 7 milestone flags using Ghost's existing Labs conventions.
---

# Admin 7 milestone flags

1. Read the canonical [Admin 7 milestone convention](../../../docs/practices/feature-flags.md#admin-7-milestones).
   Follow its existing-hook and shared-provider pattern for the affected boundary.
2. For a new Labs key, use [Add private feature flag](../add-private-feature-flag/SKILL.md)
   for registration and the settings toggle.
3. Follow the guide's focused testing and removal guidance. Report which off/on
   boundaries were checked, and update the canonical guide if the convention changes.
