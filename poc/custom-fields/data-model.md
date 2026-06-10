# Data model

The single agreed shape, stored in `custom-fields.seed.json` and read/written through the async repository facade. Three collections.

The key separation (mirrors beehiiv): a field's **identity/type** lives on the definition, while **presentation and whether it is required** live on each form placement. The same field can be required on signup and optional on the account page.

## 1. Field definitions (`definitions[]`)

One entry per custom field the owner creates. This is the "schema" the owner edits in admin settings. It carries identity and type only, no per-form presentation.

| Property | Meaning |
| --- | --- |
| `id` | Stable identifier (`cf_*`). Referenced by form placements and value maps. |
| `key` | Machine name (snake_case), e.g. `first_name`. Unique. Auto-derived from `label`, not shown in the create UI for the POC. |
| `label` | Display name, e.g. `First name`. The "Enter name" field in the create dialog. |
| `type` | One of the type catalog below. Drives the input control and the type badge. Read-only once placed on a form. |
| `preset` | Non-null when created from a preset (`first_name`, `last_name`, ...). `null` for fully custom fields. A preset just pre-fills `label` + `type`. |
| `tier` | Build tier (1/2/3) for the POC rollout. See ROADMAP. Not a product concept. |
| `helpText` | Optional helper/description text. |
| `options` | Array of choices. Only for `select`. `null` otherwise. |
| `multiple` | Only for `select`: `true` = multi-select (value is an array), `false` = single. |
| `archived` | Soft-delete flag (hidden from forms, existing values kept). |
| `createdAt` | ISO timestamp. |

## 2. Form placements (`forms{}`)

Map of `surface -> placement[]`, where surface is `signup` or `account`. A placement is a field added to that form. Whether a field appears on a form is determined by its presence here (replaces a definition-level visibility flag). Mirrors beehiiv's "Add field" dialog (Action → Field → Type → Placeholder → Required).

| Property | Meaning |
| --- | --- |
| `fieldId` | References a definition `id`. |
| `required` | Whether a value is required on **this** form. Per placement, not global. |
| `placeholder` | Input placeholder for this placement (`null` to fall back to a sensible default). |
| `order` | Display order within the form. |

## 3. Member values (`values{}`)

Map of `memberId -> { fieldId: value }`. Sparse: a member only has keys for fields they have a value for. Value shape follows the field `type`.

## Type catalog

Subset of beehiiv's set. Date / Date & Time are deliberately omitted for now: beehiiv stores those as plain strings with no picker, so there is no picker UX worth testing. If a date is ever needed in the POC, it is just a `text` field. Build tier indicates POC rollout order (see ROADMAP).

| `type` | Badge | Input control | Value shape | Tier |
| --- | --- | --- | --- | --- |
| `text` | Text | single-line input | string | 1 |
| `number` | Number | number input | number | 1 |
| `boolean` | True / False | toggle | boolean | 1 |
| `select` | List | dropdown (single) / multi-select | string, or string[] when `multiple` | 2 |

Notes:
- `select` is the complexity spike: it needs an options editor in the create-field form, and `multiple` forks the value shape and control on every surface. Built last.
- Portal has no design system, so the multi-select there is plain or lightly hand-built.

## Required and nullability

Stored values are **always nullable/optional**. Nothing at the storage layer enforces a value. A field being "required" is purely a **collection-time** rule that lives on the form placement (`forms[surface][].required`) and can differ per surface or per the owner's choice. The data model never rejects a missing value.

## Presets

Quick-create templates that pre-fill `label` + `type` (all `text` for now): `first_name`, `last_name`, `phone`, `company`, `address`, `website`. Owner can still rename/retype after picking one. "Custom field" = no preset, owner sets everything.

## Storage

**localStorage behind an async repository module.** Not IndexedDB.

- UI only calls the repo (`listFields()`, `createField()`, `updateField()`, `deleteField()`, `getValues(memberId)`, `setValue(memberId, fieldId, value)`), all returning Promises.
- Repo seeds from `custom-fields.seed.json` on first run, then persists to localStorage under a shared key so admin and portal (same dev origin via Caddy on `localhost:2368`) see the same data.
- IndexedDB's indexed-query advantage is irrelevant at this data size and adds async ceremony. The realism that matters (async, swappable, DB-like) comes from the facade, not the engine.
- Swap path when the backend lands: replace repo internals with real API calls; component code is untouched.
