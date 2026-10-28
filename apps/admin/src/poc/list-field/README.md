# List field POC: fake API

POC only. This folder lets the list field prototype run end to end before the
backend supports it. It is not part of the design and is never meant to merge.

## What it does

`fake-api.ts` wraps `window.fetch` in Admin, from `main.tsx`. Requests for list
fields are answered from `localStorage` (key `ghost-poc-list-field`, see
`store.ts`). Every other request goes to Ghost untouched, and the responses are
merged so list fields sit among the real ones. Ghost never sees list fields, so
the fake also refuses a Ghost field whose name a list field already has.

Handled so far:

- `GET /members/metafields/custom/`: real fields plus list fields, in the
  stored order.
- `POST /members/metafields/custom/` with `type: "list"`: creates a list field.
- `PUT` and `DELETE /members/metafields/custom/:key/` for a list field.
- `PUT /members/metafields/custom/` (reorder): Ghost is sent its own fields,
  and the full order is kept here.
- `GET /members/` and `/members/:id/`: each member comes back with its list
  answers in `metafields.custom`, keyed by the member's uuid in the store.
- `PUT /members/:id/`: list answers are kept here, and the rest of the write
  goes to Ghost.

Admin and Portal share one origin in development, so Portal reads and writes
the same store. Portal also seeds it in a browser that has none (see
`apps/portal/src/poc/list-field/`).

## The API shape the UI expects

The UI code outside this folder is written against this shape, so the backend
can replace the fake without changes to these screens. The members filter is the
exception: it leaves list fields out until filters support them.

- The `list` type lives in `@tryghost/metafield-types`, with kind `choice`.
- A list field has `options: string[]`, in display order, and
  `multiple: boolean`.
- Create sends `options` and `multiple`. Edit can change either; `options` is
  sent whole.
- A member's answer is always an array of the options they chose, as text,
  even when the field takes one answer.
- Answers are checked against `options` and `multiple` when they are
  submitted, and never after. The fake doesn't check them at all. Renaming or removing an option, or turning
  `multiple` off, leaves saved answers as they are.

## Not covered

- The backend half: `schema.js` only accepts `short_text`, `long_text` and
  `address`, nothing stores `options` or `multiple`, and nothing checks answers.
- Server-side features never see list fields: member filters (NQL), CSV import
  and export, emails. The server's import reads `metafields.*` columns against
  the fields in its database, so a column mapped to a list field is left out.
- The data lives in one browser. Clearing site data resets it.
- Copy isn't extracted for translation, such as the options editor's
  "Remove option" label.

## Tests that fail on this branch

Expected while this is a prototype; each needs updating before anything merges.

- `ghost/test/unit/server/data/schema/metafields-schema.test.ts`: the schema's
  type list must match `FIELD_TYPE_IDS`, which now includes `list`.
- `apps/admin/src/settings/membership/checkout/checkout-fields.acceptance.test.tsx`
  and `e2e/helpers/pages/admin/settings/sections/checkout-settings-modal.ts`:
  they look for the old inline "New custom field for {label}" input, which the
  create popover replaced.
- `apps/admin/src/members/import-members-custom-fields.acceptance.test.tsx`:
  written for the old inline create form, not yet run against the popover.

## Worth keeping

Some changes outside this folder aren't specific to the prototype:

- `use-sortable-indexed-list` moved from `settings/hooks` to `shared`, and
  gained `addItems`.
- The two Shade fixes on this branch (sheet and popover exit animations) are
  meant for their own PR to `main`.

## Switching to the real API

1. Delete `src/poc/`.
2. Remove the `installListFieldFakeApi` import and call from `main.tsx`.
3. Admin and Core deploy separately, so Admin needs to detect whether the
   backend supports list fields before offering the type.
