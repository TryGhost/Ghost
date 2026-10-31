# App Installations

App Installations covers a site's record of the apps it has approved: what each
one runs, what is waiting for approval, and who did what. Apps, manifests and
changes are defined in [App Contracts](../../../../../packages/app-contracts/CONTEXT.md).

## Lifecycle

1. **Install.** A publisher opens an install link, reviews the preview and
   confirms it. The site gets a new installation, active and running that
   manifest as its approved manifest.
2. **Re-check.** Each time an app session starts, the manifest is fetched
   again. Silent changes are applied straight away. Any other change becomes
   the pending manifest and suspends the installation; a re-check that finds
   only silent changes, or the approved manifest, lifts the suspension. A
   manifest that can't be used makes the app unavailable until it can.
3. **Approval.** The publisher reviews the pending manifest, or the app at a
   new manifest URL, and approves it. It becomes the approved manifest, and a
   suspended installation is active again.
4. **Uninstall.** The installation ends and is kept as a record. Installing the
   app again starts a new installation.

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
A manifest fetched server-side from its manifest URL and parsed, ready to
preview, compare or store. A manifest is only ever used in this form, never as
the browser sent it. When Ghost stores a manifest version with an SVG icon,
it keeps a sanitized copy of the icon with it, and Admin only shows that copy.
A preview only fetches the icon when approving would add a new row.
_Avoid_: intake, fetched manifest, raw manifest

**Preview**:
What a publisher reviews before installing or approving: the loaded manifest
and, when the site already has the app, the changes from its approved manifest.
_Avoid_: dry run

**Digest**:
The fingerprint of a manifest together with its manifest URL. Confirming sends
it back, so only the manifest the publisher reviewed is installed or approved.
It doesn't cover the icon, which confirming fetches again. It also identifies
the pending manifest.
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
pages. Starting a session re-checks the app and returns the installation. The
session is pinned to the installation's revision at that point. Nothing is
stored and no token is issued; the session ends when the revision changes.
_Avoid_: login, token, connection

**Re-check**:
Fetching an installed app's manifest again from its approved manifest URL when
an app session starts, and storing what changed. The icon is only fetched when
a new version is stored, so a stored copy never changes. Every new version gets
a fresh copy, so an app can change its icon with a silent change or a resume.
If the manifest can't be loaded, is for another app, or a new version's icon
can't be loaded, the app is unavailable: the session fails and nothing is
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
_Avoid_: audit log, activity

**Actor**:
The staff member who made a change in an installation's history. There is none
for changes the re-check made.
_Avoid_: author, user
