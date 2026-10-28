# List field POC: fake API (Portal)

POC only. Portal's half of the fake described in
`apps/admin/src/poc/list-field/README.md`, which also states the API shape the
UI expects.

`fake-api.ts` wraps `window.fetch` from `index.jsx`. It reads and writes the
same `localStorage` store as Admin's fake (key `ghost-poc-list-field`). Admin
and Portal share an origin in development, so both see the same fields and
answers.

Handled:

- `GET /members/api/member/metafields/custom/`: Ghost's fields plus the active
  list fields open to members, in Settings' order.
- `GET /members/api/member/`: the member comes back with their list answers in
  `metafields.custom`.
- `PUT /members/api/member/`: list answers are kept here, and the rest of the
  save goes to Ghost.

`seed.ts` is a snapshot of the store. A browser with no store yet, such as a
phone opening the dev site over the local network, starts from it.

## Switching to the real API

1. Delete `src/poc/`.
2. Remove the `installListFieldFakeApi` import and call from `index.jsx`.
