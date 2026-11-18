# Ghost Apps agent guidance

While `apps` is in `PRIVATE_FEATURES` (`ghost/core/shared/labs.js`), this code
and `admin-x-framework`'s app API hooks build against a matching Core only,
with no older-Core fallbacks or tests. Origin, framing, identity and allowlist
checks still apply.

The bridge's Admin API allowlist (`ADMIN_API_ALLOWLIST` in
`contracts/app-contracts/src/bridge/allowlist.ts`) is a stopgap until
Permissions and auth replaces it with app-scoped tokens checked on the server.
Change its routes when an app needs them, and leave scopes, consent and per-app
permissions to that project.
