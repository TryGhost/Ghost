# Ghost Apps agent guidance

While `apps` is in `PRIVATE_FEATURES` (`ghost/core/shared/labs.js`), this code
and `admin-x-framework`'s app API hooks build against a matching Core only,
with no older-Core fallbacks or tests. Origin, framing and identity checks
still apply.

Ghost holds an app's token to the installation's approved scopes on routes
that check a permission (`403 APP_SCOPE_REQUIRED`) and refuses it on the rest
(`403 APP_NOT_ALLOWED`). The app gets those answers: neither code says
anything about the app's session. To open a route to apps, give it a
permission key in Core that a scope names, and add it under that scope in
`APP_ROUTES` (`contracts/app-contracts/src/bridge/app-routes.ts`), the
reviewed list of what each scope opens, which a test in Ghost holds to the
server's routes in both directions. The bridge sends only the routes listed
there, and doesn't check the installation's scopes for them. A new scope goes
in the scope registry (`contracts/app-contracts/src/scopes.ts`) with its
review wording.

The bridge also covers what the server doesn't check yet: `SERVER_GAPS` in
`contracts/app-contracts/src/bridge/server-gaps.ts`, each one unit that names
the issue that moves it to the server and holds its own check or rewrite of
the request. A route's entry in `APP_ROUTES` names the gaps the bridge applies
on it, or none, so opening a route means deciding that in the same edit. Add a
gap only for something that would let an app do lasting harm until the server
checks it, give it a test in `ghost/test/e2e-api/admin/app-server-gaps.test.ts`
(it doesn't compile without one), and delete it as soon as the server checks
for itself.

The bridge never sends an app's query as the app spelled it. `readQuery` reads
it strictly (plain parameter names, each once) and the bridge writes its own,
so a gap acts on the parameters the server reads; a gap reads the `query` it is
given and never parses one itself. Don't loosen what `readQuery` takes to
match what Ghost's parser happens to accept: the two parsers disagreeing is
what let requests walk past a rule.

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
