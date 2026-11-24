# Ghost Apps agent guidance

While `apps` is in `PRIVATE_FEATURES` (`ghost/core/shared/labs.js`), this code
and `admin-x-framework`'s app API hooks build against a matching Core only,
with no older-Core fallbacks or tests. Origin, framing, identity and allowlist
checks still apply.

When an app needs an Admin API route, add it to the bridge's allowlist
(`ADMIN_API_ALLOWLIST` in `contracts/app-contracts/src/bridge/allowlist.ts`)
under its resource, in the group of the registry scope that opens it. Every
registry scope must open a route, an include or a sort. A new scope goes in the
scope registry (`contracts/app-contracts/src/scopes.ts`) with its review
wording. The bridge refuses a route, include or sort whose scope the running
installation wasn't approved for. Ghost holds an app's token to its approved
scopes only on routes that check a permission, so the allowlist stays until the
server checks every route an app can reach.
