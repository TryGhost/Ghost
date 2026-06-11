# Custom fields — the real challenges

An intro to the problem space for anyone picking up this work. The POC proved the *experience* is achievable; this doc is about what makes a *real* implementation hard. The short version: adding a field to a member is trivial. The difficulty is everything *around* the field, where it's collected, how it stays consistent, and what happens over time as fields and members change.

Ordered roughly by how much they shape the design.

## 1. One field, many surfaces (the consistency problem)

The same field is collected and shown in a lot of places: the signup form, the account page, a possible post-signup survey, the admin member detail, CSV import/export, the Admin API, webhooks, email personalization, and themes. Each has different tech (admin-x React, Ember member detail, Portal UMD bundles, Handlebars themes) and no shared UI layer.

**Why it's hard:** a field's behavior (its type, validation, options, label) has to render and validate *identically* everywhere, or members get inconsistent experiences and data quality suffers. Without one source of truth for "how this field behaves," every surface re-implements it and they drift. The POC already felt this: Portal needed a shared `CustomFieldInput`, and the Ember member detail couldn't even import the shared module.

## 2. Three concepts, not one: definition vs placement vs value

A clean model separates:
- **Definition** — the field's identity and type (what it *is*).
- **Placement** — the field added to a *surface*, with per-surface settings like required, placeholder, order (where/how it's *collected*).
- **Value** — a member's answer.

**Why it's hard:** people naturally think "a custom field on a member," which conflates all three. The same field can be required on signup but optional elsewhere, present on one surface and not another. Getting teams (and the UI) to reason in these three layers is a conceptual hurdle, but skipping it makes "required", visibility, and reuse impossible to express coherently.

## 3. Required & validation are collection-time, not storage

Stored values are always nullable. "Required" is a rule enforced *when collecting on a given surface*, not a database constraint.

**Why it's hard:** the obvious mental model ("required field = must always have a value") breaks the moment you add a required field after members already exist, they have no value and that's fine. Required means "must be provided *at this collection point*," which has to be communicated clearly and enforced per placement, not globally.

## 4. The lifecycle: add / edit / delete × new / existing members

This is where most of the genuinely hard, easy-to-forget cases live.

- **Adding a field:** existing members have no value (null) until they fill it. Adding it to the signup form does *not* retroactively prompt members who already signed up, that's exactly what a post-signup survey would be for. New vs existing member divergence is permanent.
- **Editing a field:**
  - *Renaming* the label is safe, but the machine **key** must stay stable (CSV columns, API, segments, themes reference it).
  - *Changing the type* once values exist is dangerous (how do you reinterpret a number as a list?), usually disallowed after first use.
  - *Editing select options:* removing an option that members already chose leaves **orphaned values**. Block the delete, keep the stale value, or migrate? No free answer.
- **Deleting a field:** cascade-delete the stored values, or soft-archive to preserve history and past exports? And what about dangling references in segments, automations, or email templates that used it?

**Why it's hard:** each of these is a product decision with data-integrity consequences, and they multiply (3 operations × new/existing × referenced-elsewhere-or-not).

## 5. Select, the type system, and formats

Types layer in cost. Text/number/boolean are trivial. **Select is the complexity spike**: it needs an options editor, a single-vs-multi choice, and its value shape forks (string vs array) across every surface. Beyond base types sit **formats** (email/phone/url validation) and **date/date-time** (timezone handling).

**Why it's hard:** every new type multiplies work across all surfaces (admin editor, member detail, Portal controls, validation, import/export, segmentation). The type system is the main lever on scope, more types = more surface area everywhere.

## 6. Storage & scale

The core fork: a **JSON blob** on the member (low schema churn, but values aren't queryable) vs a **queryable table** (more work, but filterable/indexable).

**Why it's hard:** the right answer is driven by feature scope, not storage taste. **Filtering/segmentation and CSV import/export are day-one expectations**, and they're exactly what a JSON blob makes painful. Add scale (many fields × many members, index/query performance for segments, per-plan field limits) and the storage decision becomes the most consequential one, and the hardest to change later. Decide it up front.

## 7. The integration iceberg

Beyond the obvious UI, member data flows through many systems that all need to account for custom fields:

- CSV **import/migration** (map source columns to fields) and **export** (stable column = key)
- **Admin API** (members + a CRUD API for the definitions) and **Members API** (Portal)
- **NQL filtering / segmentation** (admin filters, email recipient segments) — see storage
- **Email personalization** (merge tags, greet by a custom field) and **automations** (trigger/branch on values)
- **Webhooks** (`member.added` / `member.edited` payloads), **themes** (`@member` exposure)
- **GDPR / "download your data"**, backup/restore, site export-import round-trip

**Why it's hard:** any of these missing makes the feature feel half-built, and each is a separate place that must include custom fields consistently (back to challenge #1).

## 8. Built-in vs custom fields

Ghost already has native `name` and `email` (and the `portal_name` toggle). Custom fields "act like" these, which creates a clash: a "First name" custom field competes with native `name`.

**Why it's hard:** you have to decide whether to **unify** built-in and custom under one "member fields" model (cleanest mental model, name/email become locked system fields) or keep them separate (less churn, but two concepts). The POC's unified signup Form fields list (built-in = toggle/locked, custom = add/remove) is one resolution worth carrying forward.

## 9. Cross-cutting concerns

- **i18n:** field labels and options are *user-defined* (Ghost can't translate them), but all surrounding UI must be. Mixed translatable / non-translatable content.
- **Permissions/roles:** who can define fields vs edit values vs see internal-only fields.
- **The Ember boundary & rollout:** the member detail is the only non-React surface and the heaviest to integrate (it couldn't share the module and needed controller wiring). Worth sequencing custom fields with any planned React migration of the members area.
- **Keeping it minimalist:** with arbitrary fields, screens bloat fast. The read-only-row + edit-modal pattern and progressive disclosure matter so the UI stays calm.

## How to introduce this to people

Lead with challenge #1 (surfaces) and #2 (the three-layer model), they reframe custom fields from "a column on a member" to "a small system for collecting member data consistently across surfaces, over time." Once people hold that frame, the lifecycle (#4), storage (#6), and integration (#7) challenges follow naturally. See [LEARNINGS.md](./LEARNINGS.md) for what the POC concretely surfaced, and [ideas/integration-surface.md](./ideas/integration-surface.md) for the full checklist.
