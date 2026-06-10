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

## Built-in fields vs custom fields (unify them)

Ghost already has built-in member attributes collected at signup, `email` (required) and `name` (optional, toggled by the `portal_name` setting). These "act like" custom fields, which creates a clash if you naively add name presets.

What worked conceptually: treat the signup config as **one unified "Form fields" list** where built-in and custom fields coexist, distinguished by how they're controlled:

- **Email** = system field: locked, always required, can't remove.
- **Name** = built-in: an on/off **toggle** (maps to `portal_name`), not add/remove.
- **Custom fields** = add/remove rows with per-placement Required/Optional and a `…` menu.

This reconciles `portal_name` with the placement model and is the planned Story 3 approach. For a real build, the cleanest version makes `name`/`email` first-class **system fields** in the same fields model (locked type/deletion), so there's a single mental model for "things you collect about members" and the signup name toggle is just a placement of the `name` field.

**Presets deferred (not dropped).** Because `name` is built-in, beehiiv-style First/Last/Full name presets would create two competing name sources, so no presets in the POC. But gap-filling presets (Phone, Company, …) could be useful later, and a preset could pre-pick a *format* (see below). Tracked in [ideas/field-formats.md](./ideas/field-formats.md). (Open question: publishers who want split first/last names that `member.name` can't store.)

**Field formats (validated types).** "Phone / email / url" are not presets, they carry validation. Model them as a `format` on a base text type (mirrors HTML input types / JSON Schema), surfaced in the UI as more data types. Deferred; see the idea doc.

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
- **Signup field order is hardcoded.** `signup-page.js` leads with `email` and `unshift`s `Name` above it when `portal_name` is on; `tabIndex` (1/2) and `autoFocus` (`fields[0]`) are hardcoded. Data-driven order (drag-to-reorder in the unified list) requires built-in email/name to be represented as entries in one ordered list alongside custom placements, with autoFocus/tabIndex derived from position. Email stays required/locked even if moved; the honeypot stays hidden/appended.
- Signup values must survive the magic-link round trip (they ride in the token data), not just the logged-in update path. In the POC we sidestep this by writing values straight to the repo on submit (faked member id); a real build must thread custom values through `sendMagicLink` → `_handleSignup`.
- **`InputField` only renders a plain `<input>`** (text/email/number). boolean needs a checkbox, select needs a native `<select>` (with a manual chevron, since `.gh-portal-input` sets `appearance: none`) or a checkbox group for multi. Custom controls were hand-built in `signup-page.js` rather than extending the shared `InputField`/`InputForm` (used by other pages).
- **Validation reuse:** `ValidateInputForm`/`FormInputError` validate any field with `required && !value`, so putting custom fields into the same `fields` array gives required-validation for free, as long as empty values coerce correctly (empty multi-select → `''`, unchecked boolean → `false`). The default message uses `field.name`, so for a nice label we pass a label-based message ourselves.
- **"Placed = required"** is enforced in the renderer (`required: true` for every custom placement), not trusted from the stored flag, so legacy/seed data can't make a placed field optional by accident.
- **Cross-document live sync:** the same-tab subscribe/notify doesn't reach a separate bundle (admin vs Portal preview iframe). A `window 'storage'` listener in the repo bridges them so the live preview reflects admin edits. A real build gets this from the server + query invalidation.

## Member detail (Ember admin)

- **Ember can't relative-import outside its app tree.** The classic ember-cli build only compiles `app/`, and ember-auto-import only routes *package* (node_modules) imports through webpack, not outside-app relative paths. So the shared `poc/custom-fields/repo` is unreachable from Ember. We used an in-app accessor (`app/utils/custom-fields-poc.js`) that mirrors the same localStorage key + JSON shape (Option A). It interoperates by data contract, at the cost of duplicated read/write logic.
- **Joining the dirty/Save flow took controller wiring.** Inline auto-save was rejected; to match the rest of the form we lifted a working copy into the `member` controller (`customFieldValues`), added it to `_hasDirtyAttributes`, and flushed in `saveTask` after `member.save()` (union of saved+working keys so cleared fields delete). The component is a controlled view (`@values` + `@onUpdate`). This is the pattern a real build would follow, except values would live on the member model / its own endpoint.
- **Minimalist read-only rows + edit modal** (pencil → modal with the type-specific control) kept the screen clean and is the better UX than always-rendered inputs. Mirrors the label-edit affordance.
- **Reuse existing Ember patterns, not Tailwind.** The grey type badge needed a real CSS class in `members.css` (`.gh-member-customfield-type`); inline `style` with `var(--…)` was unreliable. Native select chevron comes from the existing `gh-select` wrapper + `arrow-down-small`, not a hand-rolled arrow.
- **`require-input-label` is strict.** Each control needs exactly one labeling method; a shared `id` across template branches plus `aria-label` reads as "multiple labels". Use unique ids or `aria-label`-only, and a wrapping `<label class="switch">` for toggles (matching Newsletters).

## Should the members page move to React first?

The member detail is the **only non-React surface** in the loop, and it was the heaviest integration: the in-app bridge (Ember can't import the shared module) plus controller dirty/Save wiring. That's a real signal for a production build.

Trade-off, not a verdict:
- **If a React migration of member detail is near-term planned:** doing custom fields in Ember now is throwaway work, and the React version would share admin-x's data layer (react-query) and the shared module directly (no bridge). Leaning toward doing custom fields *after* / *as part of* that migration avoids duplication.
- **If it's not near-term:** the Ember integration is viable as shown, but a real build adds a `customFields` attribute to the Ember Data member model + serializer and saves through `member.save()`, spreading POC-shaped code across Ember that a later React migration would redo.
- Either way the **member detail is the most expensive surface** for this feature; sequencing it with any planned React migration is worth deciding before committing to a backend build.

## i18n

- Field **labels/options are user-defined** (not translatable by us), but all surrounding UI strings (titles, buttons, validation) must go through `t()` and `ghost/i18n` for a real build. The POC skipped this.

## POC mechanics worth reusing

- A single async repository facade (`repo.js`) with the shape a real API would have meant **zero call-site churn** is expected when swapping localStorage for a backend. Writing UI against the async interface from day one paid off.
- A seed-version bump that auto-reseeds localStorage made iterating on the seed painless during review.
- A tiny same-tab subscribe/notify in the repo kept independent views (admin section, signup list) live without reloads. A real build gets this from react-query cache invalidation, worth ensuring all surfaces share one query layer so a create/edit/delete reflects everywhere immediately.
- The create/edit modal should **save & close**: leaving it open in create mode lets repeated Saves spawn duplicate records. Easy to miss.
