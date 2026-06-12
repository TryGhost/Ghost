# Idea / future task: Custom fields list — fill stats + reordering

**Status:** Backlog. Not in the POC. Capture for later. Enhancements to the admin **Custom fields** management list (where definitions are created/managed), inspired by the Newsletters and Recommendations lists.

## 1. Per-field fill stats (like Newsletters' Subscribers / Delivered)

Show, per row, how many members actually have a value for that field, so owners can see which fields are used (and prune dead ones).

- **Display:** either a single count ("**1** member") or a filled/total ratio ("**X / Y**" = members with a value / total members). Mirror the Newsletters stat columns.
- **Responsive:** hide the stat on narrow widths, exactly as Newsletters does (`hidden md:table-cell!`), so it never crowds the name/Edit.
- **POC:** count = members in the repo `values` with a non-empty value for the field id.
- **Real build:** a count per field over the `members_custom_fields` join (cheap with an index; consider caching for big lists). Pairs naturally with the segmentation/NQL work (a field's usage is a `field_id IS NOT NULL` count).

## 2. Drag-to-reorder the definitions

Let owners reorder the custom-field list to group related fields, instead of being stuck with creation order.

- **Why it matters (verified):** the Custom fields list **and** the "Add a custom field" picker (`form-fields-list.tsx` `addOptions`) both render `listFields()` in definition-array order. So the list order *is* the picker order — reordering here regroups the picker everywhere (signup + landing), letting owners cluster related fields.
- **How:** reuse `SortableList` (same as the form-fields list / Newsletters). Either store an explicit `order` on each definition or persist the reordered array. Today there's no `order` field; definitions are array-ordered by insertion.
- **Scope note:** this is the **global definition order** (what seeds the picker). It's distinct from **per-surface placement order**, which is already drag-reorderable inside each form's field list and stored per placement.

## 3. "Show all" when the list is long (like Recommendations)

When there are more than ~5 custom fields, show the first 5 and a **"Show all"** link (green, bottom-left of the list) that expands the rest, so a publisher with many fields doesn't bloat the Membership settings page. Reuse the **exact Recommendations pattern + styling** (`recommendation-list.tsx` / its `Show all` affordance): same cap (5), same link placement, same expand behaviour. Plays nicely with reordering (#2) — the first 5 shown are the top-ordered ones.

## Not now

All three are admin-list polish on top of a working feature; revisit if the custom-fields management screen gets real investment. Related: [field-formats.md](./field-formats.md), [integration-surface.md](./integration-surface.md) (segmentation/usage queries).
