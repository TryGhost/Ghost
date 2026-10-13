# App Contracts

App Contracts covers what Ghost and an app must agree on: how an app describes
itself, and how two descriptions of the same app differ. How a site installs and
approves apps is in [App Installations](../../ghost/core/server/services/app-installations/CONTEXT.md).

## Language

### Apps

**App**:
Software a developer runs on their own servers that shows up inside Ghost.
Distinct from the built-in "internal apps" Ghost loads from its own source.
_Avoid_: plugin, integration, extension

**App ID**:
The developer-chosen, reverse-domain identifier that is an app's identity
wherever it is served from.
_Avoid_: app key, slug

**Publisher**:
The site's staff member who installs an app and approves changes to it.
_Avoid_: user, owner, admin

**Development app**:
An app served from the machine Ghost runs on, accepted only while Ghost runs in
development.
_Avoid_: local app, test app

### Manifests

**Manifest**:
The JSON document an app serves to describe itself to Ghost.
_Avoid_: config, app.json, descriptor

**Manifest URL**:
The address a manifest is read from. It decides where every later version of
the manifest comes from, so it is part of what a publisher approves.
_Avoid_: install URL, app URL

**Parsed manifest**:
A manifest Ghost has accepted, with every URL in it resolved to an absolute
address. Manifests are compared and kept in this form.
_Avoid_: validated manifest, resolved manifest

**Ghost URLs**:
The addresses of the site and of Admin. Nothing Ghost loads from a manifest may
share their origins.

### Surfaces

**Surface**:
A place in Ghost where an app asks to appear.
_Avoid_: extension point, slot, placement

**Admin page**:
The surface that shows an app's own page inside Admin.

**Served from**:
The host an app's page loads from: where the app runs. It can differ from the
host of its manifest URL.
_Avoid_: app host, origin

### Changes

**Change**:
One field that differs between two versions of an app's manifest, the manifest
URL included.
_Avoid_: diff, update

**Silent change**:
A change that applies without the publisher approving it again. Only text and
colour qualify; anything that says who the app is, or is a URL Ghost loads or
links to, does not.
_Avoid_: minor change, safe change

**Move**:
A change in where an app is served from or, failing that, in the host of its
manifest URL. A new path on the same host is not a move.
_Avoid_: migration, relocation
