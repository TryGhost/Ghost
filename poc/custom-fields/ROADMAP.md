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
| 1 | [Admin: define custom fields](./stories/01-admin-define-fields.md) | admin-x-settings | Not started |
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

## Open questions

- Multi-select control in Portal (no design system): plain checkboxes vs a hand-built dropdown. Decide in Story 3/4.
- What happens to member values when a `select` option is deleted. Decide in Story 1 (Tier 2).
