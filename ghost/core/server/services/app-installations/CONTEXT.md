# App Installations

App Installations covers a site's record of the apps it has approved: what each
one runs, what is waiting for approval, and who did what. Apps, manifests and
changes are defined in [App Contracts](../../../../../contracts/app-contracts/CONTEXT.md).

## Lifecycle

1. **Install.** A publisher opens an install link, reviews the preview,
   including the scopes the app asks for, and confirms it. The site gets a new
   installation, active and running that manifest as its approved manifest,
   and pins the app's identity key.
2. **Re-check.** Each time an app session starts, the manifest is fetched
   again and must pass the identity check. Silent changes are applied straight
   away. Any other change becomes
   the pending manifest and suspends the installation; a re-check that finds
   only silent changes, or the approved manifest, lifts the suspension. A
   manifest that can't be used makes the app unavailable until it can.
3. **Approval.** The publisher reviews the pending manifest, or the app at a
   new manifest URL, and approves it. It becomes the approved manifest, and a
   suspended installation is active again.
4. **Uninstall.** The installation ends and is kept as a record. Installing the
   app again starts a new installation.

Admin can only explain a failure code that App Contracts' `APP_FAILURE_CODES`
lists, so each code thrown here `satisfies AppFailureCode`. A unit test catches
one thrown without it, and one the list keeps after nothing here throws it.

## Language

### Installations

**Installation**:
One site's approval of one app, from install until uninstall. A reinstall is a
new installation, never the old one brought back.
_Avoid_: app, install record

**Current installation**:
The installation of an app that hasn't been uninstalled. A site has at most one
per app ID.

**Approved manifest**:
The manifest an installation runs: the version the publisher last approved, or
a newer one the re-check applied because it had only silent changes.
_Avoid_: active manifest, current manifest

**Stored changes**:
What a manifest row differs by from the approved manifest when the row was
added, kept with the row: field changes by path and scope changes by scope,
in the shape App Contracts defines for a change. An install's are compared
against no manifest at all, so they list every scope it grants. The preview and
the history serve them as Ghost computed them, and Admin only displays them.
_Avoid_: diff, changelog

**Pending manifest**:
A newer manifest the re-check found that needs the publisher's approval. An
installation has at most one; a newer one replaces it.
_Avoid_: draft, staged manifest

**Active**:
An installation that runs its approved manifest.

**Suspended**:
An installation that doesn't run until its pending manifest is approved, or
until the app reverts the pending changes.
_Avoid_: paused, disabled

**Uninstalled**:
An installation that has ended. It is kept as a record and never runs again.
_Avoid_: deleted, removed

**Approved scopes**:
The `scopes` of the approved manifest. Every scope is required, so they are
exactly what the publisher approved. The stored changes of each manifest row
also record which scopes were added or removed, for the history. A reinstall
approves its scopes afresh.
_Avoid_: granted scopes, permissions

**Pinned identity key**:
The identity key an installation was created with. It never changes: a manifest
for the app signed with any other key is refused, so changing keys means
uninstalling the app and installing it again.
_Avoid_: trusted key, saved key

**Retired backend key**:
A backend key that a verified manifest for the app, signed with the same
identity key, has replaced with a newer one, on any installation of the app,
uninstalled ones included. A manifest naming a retired key is refused, so the
app can never go back to it, even by being uninstalled and installed again. A
rollback that keeps the backend key isn't affected.
_Avoid_: revoked key, old key

**Revision**:
The installation's change counter. Every change to the installation increments
it. An approval fails if the revision changed since the review, and an app
session ends when the revision changes.
_Avoid_: version

### Reviewing

**Install link**:
An Admin link that carries a manifest URL and opens a publisher's review of
that app.

**Loaded manifest**:
A manifest fetched server-side from its manifest URL, its signature verified and
parsed, ready to preview, compare or store. A manifest is only ever used in this
form, never as the browser sent it. When Ghost stores a manifest version with the
app's own icon, it keeps a copy of the icon with it, and Admin only shows that
copy. A preview only fetches the icon when approving would add a new row.
_Avoid_: intake, fetched manifest, raw manifest

**Preview**:
What a publisher reviews before installing or approving: the loaded manifest,
once it has passed the identity check, and, when the site already has the app,
the changes from its approved manifest.
_Avoid_: dry run

**Trusted origin**:
An origin the site's own configuration exempts from the challenge, and from
nothing else: the signature, the pinned identity key and the publisher's review
still apply. When Ghost runs in development, the machine's own origins are
trusted too. A preview says an app on trusted origins is trusted by the site's
configuration, not verified.
_Avoid_: allowlisted origin, allowed origin

**Digest**:
The fingerprint of a manifest, which names its own manifest URL. Confirming
sends it back, so only what the publisher reviewed is installed or approved. It
doesn't cover the icon, which confirming fetches again. It also identifies the
pending manifest.
_Avoid_: hash, checksum, token

**Install**:
Confirming a reviewed manifest for an app the site has no current installation
of.

**Approval**:
Confirming a reviewed manifest for an app the site already has: its pending
changes, or the same app at a new manifest URL.
_Avoid_: accept, update

### Keeping up with the app

**App session**:
One run of an installed app in Admin, started when Admin opens one of its
pages. Starting a session re-checks the app and returns the installation and,
for an active one, a user token. The session is pinned to the installation's
revision at that point. Nothing about the session is stored; it ends when the
revision changes. Sessions open only on the `better-auth` auth engine, for a
verified staff session of an active Administrator or the Owner.
_Avoid_: login, connection

**User token**:
The token an app's Admin API calls are to be sent with, issued by Better Auth's
OAuth provider when a session starts. It acts for the staff user, is bound to
their staff session and lasts an hour. Every call checks the installation is
active, the user is active and the staff session still exists and is
verified. The approved
scopes as they are now, whatever the token or its OAuth client say, cap the
permission checks the call meets; a route that checks no permission isn't
limited by scope yet, so Admin's bridge allowlist still filters what an app
can send. Only Admin holds the token; the app's frame never sees it.
_Avoid_: app token (the backend's own token), access token

**Renewal**:
A new user token for a session, without re-checking the app. Each renewal
creates another token and stores nothing. A token says how long it lasts in
seconds (`expires_in`), so renewal can be scheduled on the browser's own clock. It is refused
once the installation is suspended, uninstalled or at another revision than
the session's, which ends the session.
_Avoid_: refresh

**OAuth client**:
The provider's record of an installation, which its user tokens are issued
to. Install, approval, uninstall and session start bring it in step with the
installation, outside the installation's transaction: the installation is the
authority on every call, so a client out of step grants nothing. A client of
an installation that isn't active is disabled and its tokens deleted.
_Avoid_: app, integration

**Re-check**:
Fetching an installed app's manifest again from its approved manifest URL when
an app session starts, with the challenge to its origin sent at the same time,
running the identity check, and storing what changed. The icon is only fetched
when a new version is stored, so a stored copy never changes. Every new version
gets a fresh copy, so an app can change its icon with a silent change or a
resume. A manifest that can't be loaded, fails the identity check, or is for
another app, or a new version's icon that can't be loaded, makes the app
unavailable: the session fails with that failure's own code and nothing is
stored, so the app opens again once it's fixed.
_Avoid_: refresh, sync, poll

**Silent change**:
A change App Contracts says needs no approval. The re-check applies it to the
approved manifest straight away, without the publisher. Any other change makes
the newer manifest the pending one and suspends the installation.
_Avoid_: minor change, safe change

### History

**History**:
The timeline of an installation, newest first: installed, updated, suspended,
resumed, changes approved and uninstalled. Each update, suspension and resume is
one manifest row the re-check stored. Resumed means the app reverted the pending
changes, so the re-check lifted the suspension, applying any silent changes.
Each entry shows the changes stored with its manifest row, computed against
the approved manifest when the row was added: an install lists everything it
granted, a suspension what waits for approval, and an approval the changes of
the manifest it approved.
_Avoid_: audit log, activity

**Actor**:
The staff member who made a change in an installation's history. There is none
for changes the re-check made.
_Avoid_: author, user
