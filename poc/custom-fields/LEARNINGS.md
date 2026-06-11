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
- **Connected Portal surfaces (the simpler mental model).** Rather than a separate account-page configurator, the account page **reuses the signup placement list**: the owner curates one Portal field list, and members self-edit on the account page whatever was collected at signup. It removes a whole surface + configurator from the POC. Trade-off: it conflates "collected at signup" with "member-self-editable". A real build might keep them as separate surfaces if a publisher wants to collect something at signup that isn't later editable (or vice-versa). The placement model supports either; the POC just collapses them.
- **Shared `CustomFieldInput` control.** The per-type rendering (text/number → `InputField`, boolean checkbox, select dropdown / multi checkboxes, with the manual select chevron + greyed placeholder) is one component reused by both Portal surfaces. Worth having one control component per platform (Portal, admin) so every surface renders/validates fields identically.

## Landing form — second collection surface (Story 5 Part A, admin)

- **A new surface dropped in with zero model change.** `landing` is just another key in the `forms` placement map plus a feature `setting` and a per-member `dismissed` map. The definitions/placements/values split (above) absorbed it without touching field definitions or value storage, the strongest evidence yet that "surfaces are an open set" is the right call. A real build adds a `landing` placement list + an on/off setting + per-member dismissal state; nothing about the field model itself changes.
- **The field picker is genuinely surface-agnostic.** The signup-only `SignupFormFields` generalized into one `FormFieldsList<{surface, ...}>` used by both signup and landing with no forked logic. Built-in Email/Name rows and the `portal_name` toggle are gated by props (`updateSetting` present, surface === signup), so landing just renders custom placements. A field defined once becomes an option on every surface, and each surface keeps its own independently ordered placement list. Worth preserving in a real build: one fields-list component per platform, parameterized by surface.
- **Match the established section pattern, don't invent one.** The section reuses the **Welcome-emails** shape (top-right "Customize" + a `List` row with an enable `Toggle`) and the modal reuses the **Portal `PreviewModalContent`** two-pane layout with a `TabView` (General / Segmentation), the same component the Portal modal uses. Reviewer feedback consistently pushed toward *exact* reuse: same `<div className='mt-7'><Form>` wrapper for tab-body spacing, same "Form fields" heading, no sidebar description (Portal/Announcement modals show none). Cramped/odd spacing was always a sign of *not* reusing the real markup.
- **The Segmentation tab is a forward-pointer.** A placeholder tab cheaply signals where Story 5.5 (audience targeting) will live without building it, and validated that the modal has room for per-form config beyond the field list.
- **A static mock preview, not a real iframe.** Unlike the signup preview (a live Portal iframe via `portal-frame`), there is no Portal iframe for an injected landing card, so the preview is hand-built. That means manually matching Portal styling (the Save button to `.gh-portal-btn`: 44px / 6px radius / weight 500 / ~15px / accent bg). It's faithful but duplicated; a real build would render the actual member-facing card component in the preview instead of a look-alike.

## Landing card — member-facing prompt (Story 5 Part B, Portal)

- **The cross-surface member key is `uuid`, not `id`.** This was the bug that hid the card. The Portal member object (`formattedMemberResponse`, `ghost/core/.../services/members/utils.js`) exposes **only `uuid`** — there is no `id`. So `member.id` was `undefined` on every Portal surface, meaning the account page (Story 4) and the landing card were both writing/reading values under an `undefined` key. Meanwhile the Ember member detail (Story 2) keyed by the member's Ghost hex `id`, and signup keys by a hardcoded `DEMO_MEMBER_ID` (no member exists yet at signup). **Three surfaces, three different keys.** The fix: standardize every *real-member* surface on `uuid` — Portal account + landing use `member.uuid`; the Ember member model gained a `uuid` attr (the admin API already returns it) and its controller keys custom-field values by `member.uuid`. Signup stays on the demo id (genuinely no member at submit time; a documented limitation). **Lesson for a real build:** pick one stable member identifier up front and use it on every surface. `uuid` is the right choice because it's the only id Portal exposes and the server already has it; keying by anything else silently breaks cross-surface continuity.
- **localStorage is per-browser-profile.** The POC's storage doesn't cross browsers, devices, incognito, or profiles (it does survive reloads/tabs in the same profile, and the `storage` event syncs tabs). Testing gotcha: configure the form and land/impersonate the member in the *same* browser profile, or the landing context has an empty store and the card never shows. A real (DB-backed) build is shared everywhere for that member automatically — and `uuid` is exactly the key that makes that work.
- **Inject the card as its own `Frame`, reuse the popup's animation technique.** The card renders in an isolated iframe like `Notification` (same `renderFrameStyles` + `getFrameStyles` pattern), so it inherits the gh-portal styles and brand color. Smooth entrance came from copying how `PopupModal` animates: a CSS keyframe (transform + opacity) on the card *inside* a fixed iframe, not animating the iframe element. The first laggy version resized the iframe via `setInterval` polling, which fought the animation; a `ResizeObserver` on the card (not the body — observing the body creates a measure→resize feedback loop) updates height only when content changes.
- **Sizing an iframe to its content is the fiddly part of a non-blocking overlay.** A modal can be full-viewport; a soft corner card can't (it would swallow clicks over empty space). The working recipe: bottom-anchor the card in the iframe (`min-height: 100vh; justify-content: flex-end`) so a height correction never makes it jump, measure the *card* element and set the iframe to `card height + padding`, and cap the card to the viewport (`max-height` from `window.innerHeight`, recomputed on resize) with the fields scrolling and the header/buttons pinned. A real build that renders the card in the page DOM (not an injected cross-origin script) sidesteps all of this.
- **Two exit paths, both soft.** Save fills the gap (so the show-rule naturally stops showing it); "Not now"/close sets a persisted per-member `dismissed` flag and never blocks. The forced email route (`?cf_landing`) bypasses `dismissed` so an explicit "complete your profile" link can still re-open it. There's no snooze middle-ground (dismiss is permanent until cleared) and no cap on fields-per-visit; both are real-build refinements (see [ideas/landing-form-presentation.md](./ideas/landing-form-presentation.md) for card-vs-modal and skippable-vs-required).

## Audience-targeted landing forms (Story 5.5)

- **Multiple forms dropped in without a model rethink.** The single `forms.landing` placement list became a `landingForms` list of `{id, name, description, audience, enabled, order, fields[]}`, and per-member dismissal went from one flag to per-form (`dismissed[memberId][formId]`). The definitions/values collections were untouched. Same evidence as before: the data model scales from one surface to many forms cheaply.
- **Precedence = list order, audience-only assignment.** A member is assigned the **first enabled form whose audience matches** them; that one form's card shows if incomplete and not dismissed. Matching is audience-only (not "first form with missing fields"), so completing/dismissing never cascades to another form — one form per member, deterministic, drag to re-prioritise. This sidesteps the "overlapping segments, who wins?" problem that an unordered or most-specific-wins rule creates.
- **Audience = reuse the Newsletter recipient filter; store the NQL string.** The admin audience picker reuses `default-recipients.tsx`'s pattern (`Select` + `useDefaultRecipientsOptions` tier/label `MultiSelect`), trimmed to All / Paid-only / Specific people. Audience is stored as the same comma-joined NQL-style filter the picker already emits (`status:-free`, tier ids, `label:slug`), so it flows straight into the real query path with no translation.
- **Labels are the one thing the POC can't match live — but they're easy server-side.** Matching runs client-side in the Portal card, where the member object has `status`/`paid`/`subscriptions(tiers)` but **no labels**. So label audiences are selectable in admin but inert in the live card. This is a POC artifact, not a real constraint: members have a queryable `labels` relation (`members_labels` → `labels`), NQL already supports `label:slug` (`models/member.js`), and Ghost already resolves these filters server-side when sending newsletters. **In production, labels are no harder than tiers** — the server picks the matching form for the authenticated member, exactly like it picks newsletter recipients. Verified in code.
- **Match real list components, don't hand-roll rows.** First attempt hand-built the row container; it looked "more compact" and the borders/hover were subtly off. The fix was to render the **actual `Table`/`TableRow`/`TableCell`** via `SortableList` with `wrapper={Table}`, exactly as `newsletters-list.tsx` does — which gives the matching height, the fading hover overlay, the last-row border handling, and the `description || 'No description'` rhythm for free. Lesson: to match an existing list, reuse its components, not its look.
- **Preview vs real card: the POC's one real visual gap, and signup shows the fix.** The admin live preview (`landing-preview.tsx`, Tailwind mock) and the real card (`landing-card.js`, Portal `gh-portal` CSS + `CustomFieldInput`) are **two separate implementations**, so they drift (different fonts/tokens, real inputs vs mock boxes, big centered card vs compact capped corner card). The signup *preview* has no such drift because `portal-preview.tsx`/`PortalFrame` render the **real Portal in an iframe** (`getPortalPreviewUrl`) — the preview is the production component. The landing card preview is a mock only because the card is an **injected overlay**, not a Portal page/route the preview URL system renders. The real-build fix: give Portal a preview mode that mounts the actual `LandingCard` and point an iframe at it (like signup), so preview == real card by construction.
- **i18n: the card copy is wrapped in `t()` but not registered.** All member-facing strings (`Tell us a bit more about you`, `Save`, `Not now`, …) go through `t()`, but the POC deliberately doesn't run `pnpm --filter @tryghost/i18n translate`, so the keys aren't in `ghost/i18n` and fall back to English while existing keys (e.g. `Save`) translate. A real build runs the extract and adds `context.json` descriptions; the POC avoids polluting the shared locale files with throwaway strings.

## Member detail (Ember admin)

- **Ember can't relative-import outside its app tree.** The classic ember-cli build only compiles `app/`, and ember-auto-import only routes *package* (node_modules) imports through webpack, not outside-app relative paths. So the shared `poc/custom-fields/repo` is unreachable from Ember. We used an in-app accessor (`app/utils/custom-fields-poc.js`) that mirrors the same localStorage key + JSON shape (**Option A**). It interoperates by data contract, at the cost of **duplicated read/write logic and drift risk** (change the shape/key/SEED_VERSION in `repo.js` and the accessor must follow).
- **This is a POC-only concern.** A real build has **no localStorage** — each surface reads/writes the DB via its native data layer (admin-x → react-query API hooks, Portal → members API, member detail → Ember Data model + serializer or its React successor). The shared `repo.js` and the Ember accessor are scaffolding that gets deleted wholesale, so the Option A duplication is a minor, POC-lifetime annoyance, not architecture. (A shared workspace package would dedupe the two shims during the POC, but it's not worth the package/lockfile wiring for code that won't ship.)
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
