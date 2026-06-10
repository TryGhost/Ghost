# Story 1 — Admin: define custom fields

**Goal:** a "Custom fields" section in the admin-x-settings Membership sidebar where the owner can create, edit, archive, and delete field definitions.

**Status:** Not started

**Depends on:** Story 0.

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
