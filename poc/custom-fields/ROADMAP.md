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
| 0 | [Foundation: data model + repository facade](./stories/00-foundation.md) | shared | Demoable (verified when Story 1 imports it) |
| 1 | [Admin: define custom fields](./stories/01-admin-define-fields.md) | admin-x-settings | Built (Tier 1 + Tier 2); final test pending |
| 2 | [Admin: member detail values](./stories/02-admin-member-detail.md) | Ember admin | Not started |
| 3 | [Portal: collect at signup](./stories/03-portal-signup.md) | portal | Not started |
| 4 | [Portal: self-edit on account page](./stories/04-portal-account.md) | portal | Not started |

Status values: `Not started` / `In progress` / `Demoable` / `Done`.

## The loop we are validating

```
Owner defines fields (Story 1)
        ->  Owner sets/sees values per member (Story 2)
        ->  Field collected from new members at signup (Story 3)
        ->  Member self-updates their own values (Story 4)
```

The POC is successful if that loop feels natural to test users, independent of how data is stored.

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
- **Account page is opt-in**: it starts empty and the owner adds the fields members may self-edit (the `account` placements). No field is exposed by default.
- **Field descriptions (`helpText`) are dropped** for now. helpText is admin-only by design; no UI sets it.
- **Presets deferred** (not built now, not abandoned). Name-style presets would clash with Ghost's built-in `name`, but gap-filling presets (Phone, Company, …) could be useful later. The `preset` property stays nullable in the model. See [ideas/field-formats.md](./ideas/field-formats.md).
- **Signup uses a unified Form fields list** (Story 3): built-in Email (locked) + Name (toggle → `portal_name`) + custom-field placements in one reorderable list. Built-in = toggle/locked, custom = add/remove.

## Future explorations (deliberately deferred)

Out of scope for the POC, worth revisiting for a real implementation:

- **Admin-only Description**: an optional description on a field, shown only in admin (never to members). Dropped now for simplicity; the `helpText` property is reserved in the model.
- **Explicit "internal" field flag**: mark a field as admin-only so it is hard-excluded from Portal form pickers and badged "Internal", rather than relying on the owner simply not placing it. Earns its keep once the form pickers exist (Stories 3/4).
- **Post-signup survey (progressive profiling)**: collect optional fields *after* signup via a card/modal injected post-verification, instead of adding signup friction. A new `post_signup` collection surface + per-member completion state; likely lives under Growth. See [ideas/post-signup-survey.md](./ideas/post-signup-survey.md).
- **Field formats (validated types) + presets**: validated types like email / phone / url (modeled as a `format` on text, surfaced as data types), plus deferred convenience presets. See [ideas/field-formats.md](./ideas/field-formats.md).
- **Integration surface for a real build**: import/migration, CSV export, Admin API, NQL filtering/segmentation, email personalization, webhooks, themes, GDPR export, etc. The full checklist beyond the POC's UI surfaces. See [ideas/integration-surface.md](./ideas/integration-surface.md).

## Open questions

- Multi-select control in Portal (no design system): plain checkboxes vs a hand-built dropdown. Decide in Story 3/4.
- Orphaned values when a `select` option is deleted after members have values: ignored for the POC; needs a real answer (block, keep, or migrate) in a real implementation.
