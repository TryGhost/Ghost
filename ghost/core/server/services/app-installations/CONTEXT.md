# App Installations

App Installations covers a site's record of the apps it has approved: what each
one runs, what is waiting for approval, and who did what. Apps, manifests and
changes are defined in [App Contracts](../../../../../packages/app-contracts/CONTEXT.md).

## Lifecycle

1. **Install.** A publisher opens an install link, reviews the preview and
   confirms it. The site gets a new installation, active and running that
   manifest as its approved manifest.
2. **Re-check.** Each time an app session starts, Ghost loads the manifest
   again. Silent changes are applied straight away. Any other change becomes
   the pending manifest and suspends the installation; a re-check that finds
   only silent changes again, or the approved manifest, lifts the suspension.
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
The installation of an app that has not ended. A site has at most one per app
ID.

**Approved manifest**:
The manifest an installation runs: the version the publisher last approved, or
one Ghost applied by itself because it held only silent changes.
_Avoid_: active manifest, current manifest

**Pending manifest**:
A newer manifest Ghost picked up for an installation that waits for the
publisher's approval. An installation has at most one; a newer one replaces it.
_Avoid_: draft, staged manifest

**Active**:
An installation that runs its approved manifest.

**Suspended**:
An installation held from running until its pending manifest is approved, or
until the app goes back on the changes.
_Avoid_: paused, disabled

**Uninstalled**:
An installation that has ended. It is kept as a record and never runs again.
_Avoid_: deleted, removed

**Revision**:
The installation's change counter. Any change to the installation moves it on:
a review is shown against one revision, and an app session started at one ends
when it moves.
_Avoid_: version

### Reviewing

**Install link**:
An Admin link that carries a manifest URL and opens a publisher's review of
that app.

**Loaded manifest**:
A manifest Ghost has fetched from its manifest URL itself and parsed, ready to
preview, compare or keep. A manifest is only ever acted on in this form, never
as a browser handed it over.
_Avoid_: intake, fetched manifest, raw manifest

**Preview**:
What a publisher reviews before installing or approving: the loaded manifest
and, when the site already has the app, the changes from its approved manifest.
_Avoid_: dry run

**Digest**:
The fingerprint of a manifest together with its manifest URL. Confirming sends
it back, so only what the publisher reviewed is installed or approved, and it
is what tells a pending manifest apart from another.
_Avoid_: hash, checksum, token

**Install**:
Confirming a reviewed manifest for an app the site has no current installation
of.

**Approval**:
Confirming a reviewed manifest for an app the site already has: its pending
changes, or the same app served from somewhere new.
_Avoid_: accept, update

### Keeping up with the app

**Re-check**:
Ghost loading an installed app's manifest again from its approved manifest URL
when an app session starts, and keeping what changed. A manifest Ghost cannot
load, or one for another app, leaves the approved manifest running.
_Avoid_: refresh, sync, poll

**Silent change**:
A change the re-check applies to the approved manifest straight away, without
the publisher. Any other change makes the newer manifest the pending one and
suspends the installation.
_Avoid_: minor change, safe change

### History

**History**:
The timeline of an installation, newest first: installed, updated, suspended,
resumed (the app went back on the changes that waited), changes approved and
uninstalled.
_Avoid_: audit log, activity

**Actor**:
The staff member who made a change in an installation's history. There is none
when Ghost made the change itself, as with a re-check.
_Avoid_: author, user
