# App Installations

App Installations covers a site's record of the apps it has approved: what each
one runs, what is waiting for approval, and who did what. Apps, manifests and
changes are defined in [App Contracts](../../../../../packages/app-contracts/CONTEXT.md).

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
The manifest an installation runs: the version the publisher last approved.
_Avoid_: active manifest, current manifest

**Pending manifest**:
A newer manifest Ghost picked up for an installation that waits for the
publisher's approval.
_Avoid_: draft, staged manifest

**Active**:
An installation that runs its approved manifest.

**Suspended**:
An installation held from running until its pending manifest is approved.
_Avoid_: paused, disabled

**Uninstalled**:
An installation that has ended. It is kept as a record and never runs again.
_Avoid_: deleted, removed

**Revision**:
The installation's change counter. A review is shown against one revision, and
any change to the installation moves it on.
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
it back, so only what the publisher reviewed is installed or approved.
_Avoid_: hash, checksum, token

**Install**:
Confirming a reviewed manifest for an app the site has no current installation
of.

**Approval**:
Confirming a reviewed manifest for an app the site already has: its pending
changes, or the same app served from somewhere new.
_Avoid_: accept, update

### History

**History**:
The timeline of an installation, newest first: installed, updated, suspended,
changes approved and uninstalled.
_Avoid_: audit log, activity

**Actor**:
The staff member who made a change in an installation's history. There is none
when Ghost made the change itself.
_Avoid_: author, user
