# Roadmap

Deliberate, one story at a time, in this order. Do not start a story until the previous one is demoable.

## Type rollout strategy

Types ship in tiers so every story can be built against cheap Tier 1 types first, then the richer type layers in without reworking the flow. Date / Date & Time are dropped for now (beehiiv stores them as plain strings, no picker UX to test).

| Tier | Types | Why |
| --- | --- | --- |
| 1 | Text, Number, True/False | Trivial inputs. Exercise the whole pipeline end to end on every surface. |
| 2 | List (single + multi select) | The complexity spike: options editor in the create form + value-shape fork. Last. |

Each story below targets **Tier 1** for its first demoable version. Tier 2 (select) is layered across the surfaces afterward.

## Stories

| # | Story | Surface | Status |
| --- | --- | --- | --- |
| 0 | [Foundation: data model + repository facade](./stories/00-foundation.md) | shared | ✅ Done |
| 1 | [Admin: define custom fields](./stories/01-admin-define-fields.md) | admin-x-settings | ✅ Done |
| 2 | [Admin: member detail values](./stories/02-admin-member-detail.md) | Ember admin | ✅ Done |
| 3 | [Portal: collect at signup](./stories/03-portal-signup.md) | portal/admin-x-settings | ✅ Done (Part A + Part B) |
| 4 | [Portal: self-edit on account page](./stories/04-portal-account.md) | portal | ✅ Done |
| 5 | [Landing form: collect from existing members](./stories/05-landing-form.md) | portal/admin-x-settings | ✅ Done |
| 5.5 | [Audience-targeted landing forms](./stories/05.5-audience-targeted-landing-forms.md) | portal/admin-x-settings | ✅ Done |

Status values: `Not started` / `In progress` / `Demoable` / `Done`.

Stories 0–4 prove the *new-signup* loop. **Story 5** extends collection to **all existing members** via a separate "Landing form" surface, the second collection surface, reinforcing the "define once, collect anywhere" thesis.

## The loop we are validating

```
Owner defines fields (Story 1)
        ->  Owner sets/sees values per member (Story 2)
        ->  Field collected from new members at signup (Story 3)
        ->  Member self-updates their own values (Story 4)
```

The POC is successful if that loop feels natural to test users, independent of how data is stored.

**Status: the full loop is built (Stories 0–4 done).** Define a field in Membership settings → it shows on the signup Form fields list → new members fill it at signup → it appears (and is editable) on the member detail in admin and on the member's account page. All data is local (localStorage) per the storage decision; see [LEARNINGS.md](./LEARNINGS.md) for what a real, backend-backed build would entail.

## Constraints (apply to every story)

- **Reuse only existing components and patterns.** Prefer `shade` (shadcn) components; otherwise existing custom components in the target app. In Ember admin, reuse existing Ember components.
- **No new dependencies** unless strictly necessary. If something seems to require a new lib, stop and raise it before adding.
- **Mirror existing UI/UX patterns** in each surface (e.g. how Tiers/Newsletters lists, the Portal modal, and Portal input fields already look and behave). The feature should feel native, not bolted on.
- **Keep each story focused and scoped.** Tier 1 first, demoable, then move on.

## Decisions locked for the POC

- Storage: localStorage behind an async repository facade. See [data-model.md](./data-model.md).
- `key` (machine name) is auto-derived from `label` and hidden in the create UI.
- Types are a subset of beehiiv's, rolled out in two tiers. Date / Date & Time are dropped for now.
- Stored values are always nullable. `required` is a per-placement, collection-time rule only.
- **Member-visibility is implicit via form placements**: a field reaches members only if explicitly added to a Portal form. There is no separate "internal" flag.
- **Portal is connected (POC simplification)**: the account page shows the same custom fields the owner added to the **signup form** (one Portal placement list), so members self-edit whatever was collected. No separate `account` surface/configurator in the POC. (A real build could split them if collect-at-signup and self-editable need to differ.)
- **Field descriptions (`helpText`) are dropped** for now. helpText is admin-only by design; no UI sets it.
- **Presets deferred** (not built now, not abandoned). Name-style presets would clash with Ghost's built-in `name`, but gap-filling presets (Phone, Company, …) could be useful later. The `preset` property stays nullable in the model. See [ideas/field-formats.md](./ideas/field-formats.md).
- **Signup uses a unified Form fields list** (Story 3): built-in Email (locked) + Name (toggle → `portal_name`) + custom-field placements in one reorderable list. Built-in = toggle/locked, custom = add/remove.
- **Two collection surfaces** (Story 5): (1) **Portal** = signup form + account page, one connected list, targets new signups; (2) **Landing form** = a separate Membership section + its own field list, targets *all existing members* via a soft card on their next authenticated landing. Each surface is independently curated.
- **Landing form is its own Membership section** (not folded into Custom fields): sidebar order is Access → Tiers → Signup portal → Custom fields → **Landing form** → Welcome emails → Newsletters. It's a member-facing experience (toggle + card + trigger + dismissal), not a field attribute.
- **Landing prompt = soft & non-blocking**: pending is *implicit* (member missing a placed value) plus a per-member *dismiss* flag. Keyed off member state, so it reaches members regardless of signup source. A forced/blocking gate is a v2 path.

## Future explorations (deliberately deferred)

Out of scope for the POC, worth revisiting for a real implementation:

- **Admin-only Description**: an optional description on a field, shown only in admin (never to members). Dropped now for simplicity; the `helpText` property is reserved in the model.
- **Explicit "internal" field flag**: mark a field as admin-only so it is hard-excluded from Portal form pickers and badged "Internal", rather than relying on the owner simply not placing it. Earns its keep once the form pickers exist (Stories 3/4).
- **Field formats (validated types) + presets**: validated types like email / phone / url (modeled as a `format` on text, surfaced as data types), plus deferred convenience presets. See [ideas/field-formats.md](./ideas/field-formats.md).
- **Integration surface for a real build**: import/migration, CSV export, Admin API, NQL filtering/segmentation, email personalization, webhooks, themes, GDPR export, etc. The full checklist beyond the POC's UI surfaces. See [ideas/integration-surface.md](./ideas/integration-surface.md).
- **Landing form presentation + enforcement**: let the owner pick the appearance (soft **card** vs centered **modal**, reusing Portal's popup) and whether the prompt is **skippable or required** (blocking gate). See [ideas/landing-form-presentation.md](./ideas/landing-form-presentation.md).
- **Custom fields list enhancements**: per-field **fill stats** (members with a value, like Newsletters' Subscribers/Delivered) and a **"Show all"** when there are >5 fields (Recommendations pattern). (Drag-to-reorder is built.) See [ideas/custom-fields-list-enhancements.md](./ideas/custom-fields-list-enhancements.md).

## Open questions

- Multi-select control in Portal (no design system): plain checkboxes vs a hand-built dropdown. Decide in Story 3/4.
- Orphaned values when a `select` option is deleted after members have values: ignored for the POC; needs a real answer (block, keep, or migrate) in a real implementation.
- **Migrate the members page to React before a real custom-fields build?** Member detail is the only non-React surface and was the heaviest integration (in-app bridge + controller dirty/save wiring). See [LEARNINGS.md](./LEARNINGS.md) "Should the members page move to React first?".
