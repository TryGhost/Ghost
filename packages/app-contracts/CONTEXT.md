# App Contracts

App Contracts covers what Ghost and an app must agree on: how an app describes
itself, how two descriptions of the same app differ, and how Admin and an app's
page talk while Admin shows it. How a site installs and approves apps belongs
to [App Installations](../../ghost/core/server/services/app-installations/CONTEXT.md).

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

**Surface origin**:
The origin of a surface's resolved URL. It is the only origin Admin talks to
for that surface: a hello from anywhere else is ignored, and the connect is
addressed to it alone. The manifest lists no other origins.
_Avoid_: allowed origin, app origin

### Changes

**Change**:
One field that differs between two versions of an app's manifest, the manifest
URL included.
_Avoid_: diff, update

**Silent change**:
A change that applies without the publisher approving it again. Only the
description, the accent colour and the name of an icon Admin ships qualify;
anything that says who the app is, or is a URL Ghost loads or links to, does
not.
_Avoid_: minor change, safe change

**Move**:
A change in where an app is served from or, failing that, in the host of its
manifest URL. A new path on the same host is not a move.
_Avoid_: migration, relocation

### Bridge

**Bridge**:
The channel between Admin and an app's page while Admin shows it, and the calls
each side exposes over it. Admin does not trust the page, so it checks
everything the page sends; the page trusts Admin.
_Avoid_: postMessage API, iframe protocol, RPC

**Hello**:
The window message an app's page posts to Admin once the SDK has loaded, and
repeats until Admin answers. It names the SDK's version, for diagnostics only.
_Avoid_: handshake, ready, init

**Connect**:
Admin's answer to a hello from the frame it mounted and the surface origin,
handing the page the port the rest of the session travels over. Only the first
connect counts.
_Avoid_: ack, handshake

**Start**:
Admin's first call over the bridge, telling the page about the site, the staff
user by ID and role, the theme, the session's revision and the app path. The
page is shown once it has answered.
_Avoid_: init, boot, launch

**Session**:
The page's connection to Admin, from connect until the page or Admin lets go.
It is started against one installation revision, and Admin ends it when the
installation moves on, so an app never runs against a revision nobody
approved. Every call fails once it has ended; a page Admin starts again gets a
new session. Not the staff user's sign-in session.
_Avoid_: connection, login, token

**App path**:
A route within an app's own page, such as `/episodes/12`, which Admin mirrors
in its own address so a reload or a shared link lands on the same page. It
starts with a single `/` and can never name anything outside the app.
_Avoid_: URL, location, deep link

**Place**:
A named destination in Admin an app can send the publisher to, such as a post,
a page, a member or the apps list. Places are named rather than given as paths
or URLs, so an app can only open what Admin chooses to offer.
_Avoid_: route, link, URL

**Fetch escape hatch**:
The bridge's `fetch`, which calls the Admin API as the signed-in staff user on
the app's behalf. It stands in for an app's own token until apps have
permissions, and takes an Admin API path, never a URL.
_Avoid_: proxy, API access, app token

**Blocklist**:
The Admin API routes the fetch escape hatch refuses whatever the method: those
that hand out a credential outliving the session, change who can sign in or
who the staff are, or act on the whole site. It goes when the app token
arrives.
_Avoid_: permissions, scopes, denylist
