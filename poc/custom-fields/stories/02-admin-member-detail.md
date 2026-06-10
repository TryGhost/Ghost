# Story 2 — Admin: member detail values

**Goal:** a beehiiv-style collapsible "Custom fields" panel on the member detail page, showing each defined field (label + type badge) and the member's value, editable inline.

**Status:** Not started

**Depends on:** Story 1 (fields must exist to show values for).

## Surface

The member detail screen lives in the **Ember admin** (`ghost/admin`), which is the heavier lift in this POC. Confirm exact location before building (member route/controller + template).

## UX (from beehiiv)

- Collapsible section titled "Custom fields", subtitle "Custom metadata for this subscriber."
- Search box to filter fields by name.
- One row per field: label + type badge, value below (or "-" when empty), per-row menu.
- Inline edit of the value using the control for the field type.

## Tasks

- [ ] Locate the member detail route/template in `ghost/admin`.
- [ ] Read fields via `repo.listFields()` and values via `repo.getValues(memberId)`.
- [ ] Collapsible panel + search filter.
- [ ] Row rendering with type badge + value display (empty = "-").
- [ ] Inline edit per type (Tier 1: text/number/boolean), save via `repo.setValue`.
- [ ] Tier 2: select single/multi value editing.

## Open

- Integrating a localStorage repo into Ember: simplest path is a small service or direct import. Decide during build.

## Done = demoable

On a member's detail page, all defined fields show with the member's values, and editing a value persists and survives reload.
