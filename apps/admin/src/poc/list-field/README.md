# List field POC: fake API

POC only. This folder lets the list field prototype run end to end before the
backend supports it. It is not part of the design and is never meant to merge.

## What it does

`fake-api.ts` wraps `window.fetch` in Admin, from `main.tsx`. Requests for list
fields are answered from `localStorage` (key `ghost-poc-list-field`, see
`store.ts`). Every other request goes to Ghost untouched, and the responses are
merged so list fields sit among the real ones.

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

Admin and Portal share one origin in development, so Portal can read the same
store.

## The API shape the UI expects

The UI code outside this folder is written against this shape, so the backend
can replace the fake without UI changes:

- The `list` type lives in `@tryghost/metafield-types`, with kind `choice`.
- A list field has `options: string[]`, in display order, and
  `multiple: boolean`.
- Create sends `options` and `multiple`. Edit can change either; `options` is
  sent whole.
- A member's answer is always an array of the options they chose, as text,
  even when the field takes one answer.
- Answers are checked against `options` and `multiple` when they are
  submitted, and never after. Renaming or removing an option, or turning
  `multiple` off, leaves saved answers as they are.

## Not covered

- Server-side features never see list fields: member filters (NQL), CSV import
  and export, emails. The members filter leaves list fields out for now.
- The data lives in one browser. Clearing site data resets it.

## Switching to the real API

1. Delete `src/poc/`.
2. Remove the `installListFieldFakeApi` import and call from `main.tsx`.
