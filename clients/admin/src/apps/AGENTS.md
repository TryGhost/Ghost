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
scopes on routes that check a permission and refuses it on the rest, except the
site's public details. The allowlist still filters what an app can send more
finely than a scope does, such as includes, query parameters and what a write
may set.

Apps need Ghost's new auth engine. `useAppsAvailability` reads whether the site
runs it from its config, as `supported`, `unsupported` or, until the config
has loaded, `loading`. What can be done with an installation is one answer,
`installationActions` (`lib/installation-actions.ts`): ask it, wherever an
installation is listed or shown, rather than combining status, availability
and pins again. Where apps aren't supported, offer nothing that installs,
approves or opens an app, and keep listing and uninstalling working.
