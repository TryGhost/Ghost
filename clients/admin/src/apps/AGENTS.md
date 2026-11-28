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

The bridge never sends an app's query as the app spelled it. `readQuery` reads
it strictly (plain parameter names, each once) and the bridge writes its own,
so its checks act on the parameters the server reads. Don't loosen what
`readQuery` takes to match what Ghost's parser happens to accept: the two
parsers disagreeing is what let requests walk past a rule.

Apps need Ghost's new auth engine. `useAppsAvailability` reads whether the site
runs it from its config, as `supported`, `unsupported`, `loading` until the
config has loaded, or `unknown` if it failed to. Screens inside `AppsGate` see
neither of the last two, as the gate waits for the config and fails the screen
if it doesn't load; only the sidebar and search, outside it, need to handle
them. What can be done with an installation is one answer,
`installationActions` (`lib/installation-actions.ts`): ask it, wherever an
installation is listed or shown, rather than combining status, availability
and pins again. Where apps aren't supported, offer nothing that installs,
approves or opens an app, and keep listing and uninstalling working.
