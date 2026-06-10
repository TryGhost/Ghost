# Learnings (for a real implementation)

What the POC surfaced that should inform a production build, if we pursue member custom fields. Captured after Story 1 (admin define + create/edit/delete, Tier 1 + select).

## What the model got right

- **Three collections: definitions / placements / values.** Clean separation that held up.
  - `definition` = identity + type (the data primitive).
  - `placement` = a field bound to a *surface* (`signup`, `account`, future `post_signup`) with per-surface `required` / `placeholder` / `order`.
  - `value` = per-member answer.
- **Surfaces are an open set.** Member-visibility falls out of placement (a field reaches members only if placed on a member-facing surface). This is why a post-signup survey is additive (new surface), not a redesign, and why an explicit "internal" flag was unnecessary for the POC.
- **`required` is a collection-time, per-placement rule; storage is always nullable.** The same field can be required on signup and optional on the account page. The store never rejects a missing value. This separation is worth keeping in the real schema.

## Backend implications (not built; from code exploration)

Members have **no existing extensibility point** today (the `members` table is a fixed ~19 columns, no metadata blob). A real build needs a schema change. Options weighed:

- **JSON column on `members`** (mirrors the existing `commenting` codec pattern): lowest churn, but values aren't efficiently queryable/segmentable in SQL.
- **`members_custom_fields` join table** (member_id, field_id, value): more work, but enables filtering/segmentation by value, which a membership feature will almost certainly want (segments, email recipients). **Recommended** if segmentation is in scope.
- Field **definitions** and **placements** are config-like; definitions likely a table, placements either a table or serialized per-surface settings.

Key serialization/flow touchpoints found:
- Admin API member serializer: `ghost/core/core/server/api/endpoints/utils/serializers/output/members.js`.
- Members API signup path (where signup values must be captured): `services/members/members-api/controllers/router-controller.js` (`_handleSignup`, ~line 1014) — today only captures name/labels/newsletters/attribution.
- Member update allowlist (Portal account save): the Members API `member` update only accepts name/subscribed/newsletters/enable_comment_notifications today; custom values need adding.

## Type system

- **`select` is the complexity spike.** It needs an options editor in the create form and forks the value shape (string vs string[] via `multiple`) across every surface. Build trivial types first; treat select as its own milestone.
- **Date / Date & Time intentionally dropped.** beehiiv stores them as plain strings with no picker; not worth the picker UX for the POC. Revisit only if a real date need appears.
- **Orphaned values when a select option is deleted** need a real policy (block deletion, keep stale values, or migrate). Ignored in the POC.

## Admin UI (reuse worked well)

- admin-x-settings already has the exact patterns: `TopLevelGroup` + `List`/`ListItem` for the section, `Form` + `Modal` + `Select` + `TextField` + `Toggle` + `ConfirmationModal` for the editor. No new components or deps were needed.
- **`NiceModal.show(Component, props)` directly** avoids touching the router/modal registry (`settings-router.tsx`, `routing/modals.tsx`). Fewer cross-app edits; good for a contained feature.
- `useForm` flips dirty on any `updateForm` (even reverting to original), so a no-op edit prompts the unsaved-changes confirmation. This is the default everywhere; acceptable, not worth fighting.
- Destructive actions should pass `okColor='red'` to `ConfirmationModal` to match the delete-post styling.

## Portal (still ahead, Stories 3–4)

- **Portal has no design system** (TailwindCSS v3, UMD bundles). The signup/account inputs are hand-rolled in `getInputFields()`. Rendering custom fields there means hand-built controls, especially a **multi-select** for `select` + `multiple`. Budget for it.
- Signup values must survive the magic-link round trip (they ride in the token data), not just the logged-in update path.

## i18n

- Field **labels/options are user-defined** (not translatable by us), but all surrounding UI strings (titles, buttons, validation) must go through `t()` and `ghost/i18n` for a real build. The POC skipped this.

## POC mechanics worth reusing

- A single async repository facade (`repo.js`) with the shape a real API would have meant **zero call-site churn** is expected when swapping localStorage for a backend. Writing UI against the async interface from day one paid off.
- A seed-version bump that auto-reseeds localStorage made iterating on the seed painless during review.
