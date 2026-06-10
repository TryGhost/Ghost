# Story 1 — Admin: define custom fields

**Goal:** a "Custom fields" section in the admin-x-settings Membership sidebar where the owner can create, edit, archive, and delete field definitions.

**Status:** Tier 1 + Tier 2 built. Browser verification pending.

**Depends on:** Story 0.

## Built (Tier 1 + Tier 2)

- Section: `apps/admin-x-settings/src/components/settings/membership/custom-fields/custom-fields.tsx` (List of fields, label + type badge, optional description, per-row "Edit", "Add custom field" button, mirrors Recommendations/Newsletters).
- Modal: `.../custom-fields/custom-field-modal.tsx` (Name + Data type; Delete/Close/Save footer; red destructive delete confirmation).
- Wired into `membership-settings.tsx` (import + searchKeywords + render) and `sidebar.tsx` (NavItem, `textfield` icon, navid `custom-fields`).
- Data via `poc/custom-fields/repo` (no router/modal-registry edits; uses `NiceModal.show` directly).
- All four types creatable: Text, Number, True/False, **List (select)**. Type is read-only when editing.
- **Select options editor** (Tier 2): per-option text inputs with a trash button, "+ Add option", and an "allow multiple" toggle (sets `multiple`). Requires at least two options. Options + multiple are editable on edit.

## Field modal validation (built)

- Name required.
- List type: at least two options, and no blank option inputs (empty inputs are flagged red; the message clears as soon as you edit/add/remove an option). The remove button is disabled when only two options remain.

## Deferred / out of scope (documented decisions)

- **Descriptions dropped.** `helpText` is admin-only by design; we removed it from the seed and the list to keep the modal minimal. The property is reserved in the model for a future admin-only Description field.
- **No explicit internal flag.** Member-visibility is implicit: a field reaches members only if placed on a Portal form (account page is opt-in). An explicit "internal" flag is a documented future enhancement (see ROADMAP).
- **Presets** (beehiiv's "First name / Last name / Full name" chips) not built; `PRESETS` exists in the repo. Easy follow-up.
- **Orphaned values** when a select option is deleted after members have values: ignored for the POC.

## Surface

`apps/admin-x-settings` (React + shade).

- New section component under `apps/admin-x-settings/src/components/settings/membership/`.
- Register it in `membership-settings.tsx` and add a sidebar `NavItem` (`navid='custom-fields'`) in `sidebar.tsx`.
- Optionally a modal route (like `portal/edit`) if the create/edit form is large.

## UX (from beehiiv)

- A list of existing fields: label + type badge, with a per-row menu (edit / archive / delete).
- "Create new custom field" dialog: **Enter name** (label) + **Enter data type** (dropdown: Text, Number, True/False, [List in Tier 2]). `key` auto-derived, hidden.
- Presets offered as quick-create (First name, Last name, Company, ...).
- Tier 2: when type = List, show the options editor (add/remove/reorder) + single-vs-multi toggle.

## Tasks

- [ ] Section component listing fields from `repo.listFields()`.
- [ ] Type badge component.
- [ ] Create dialog (name + type), Tier 1 types only.
- [ ] Preset quick-create.
- [ ] Edit existing field (label, helpText; type read-only once values exist).
- [ ] Archive + delete (with confirm).
- [ ] Wire to repo; reflect changes live.
- [ ] Tier 2: options editor + multi toggle for List; decide option-delete behavior.

## Done = demoable

Owner can create a Text/Number/True-False field from scratch or a preset, see it in the list, edit and delete it, and it persists.
