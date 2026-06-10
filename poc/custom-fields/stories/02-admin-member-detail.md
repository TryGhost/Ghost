# Story 2 — Admin: member detail values

**Goal:** a beehiiv-style collapsible "Custom fields" panel on the member detail page, showing each defined field (label + type badge) and the member's value, editable inline.

**Status:** ✅ Done. Read-only rows + edit modal, keyed by real member.id, joins the member dirty/Save flow.

**Depends on:** Story 1 (fields must exist to show values for).

## Built

- New Ember component `ghost/admin/app/components/member/custom-fields.{js,hbs}` — a "Custom fields" card listing every defined field with this member's value, editable inline by type (text/number inputs, boolean toggle, select dropdown (single) / checkboxes (multi)).
- Inserted one line in `gh-member-settings-form.hbs` after the Name/Email/Labels/Note card.
- **Option A bridge:** `ghost/admin/app/utils/custom-fields-poc.js` — a tiny in-app localStorage accessor sharing the same key + JSON shape as `poc/custom-fields/repo` (the Ember build can't relative-import outside its app tree). Keyed by real `member.id`. Migration to a shared workspace package (Option B) is a one-file swap later.
- **Joins the dirty/Save flow** (not auto-save): the `member` controller holds a working copy of the values (`customFieldValues`), edits set `customFieldsDirty` (so the unsaved-changes prompt fires and Save lights up), and `saveTask` flushes to the repo after `member.save()`. Leaving without saving discards the pending edits (nothing was written). The component is a controlled view (`@values` + `@onUpdate`).

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
