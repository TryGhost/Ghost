# Ghost Apps agent guidance

While `apps` is in `PRIVATE_FEATURES` (`ghost/core/shared/labs.js`), this code
and `admin-x-framework`'s app API hooks build against a matching Core only,
with no older-Core fallbacks or tests. Origin, framing, identity and allowlist
checks still apply.

When an app needs an Admin API route, add it to the bridge's allowlist
(`ADMIN_API_ALLOWLIST` in `contracts/app-contracts/src/bridge/allowlist.ts`)
under its resource, in the group of the registry scope that opens it. A new
scope goes in the scope registry (`contracts/app-contracts/src/scopes.ts`) with
its review wording. The allowlist is a stopgap until Permissions and auth
replaces it with app-scoped tokens checked on the server.
