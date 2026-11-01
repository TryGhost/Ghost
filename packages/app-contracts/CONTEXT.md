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
The name a developer gives an app, in reverse-domain form. A site has at most
one current installation per App ID, and saved cards find their app by it. It
doesn't prove who made the app; the identity key does.
_Avoid_: app key, slug

**Publisher**:
The site's staff member who installs an app and approves changes to it.
_Avoid_: user, owner, admin

**Development app**:
An app whose signed manifest says it is in development, as every app on the
developer's machine must. It changes how Ghost labels the app, never what Ghost
checks.
_Avoid_: local app, test app

### Identity

**Identity key**:
The key an app's developer keeps offline and signs its manifest with. It says
who made the app: a site keeps the one it installed an app with, and a manifest
signed with any other key is a different app.
_Avoid_: signing key, private key

**Backend key**:
The key an app's backend answers challenges with. The signed manifest names it,
so the identity key vouches for it.
_Avoid_: server key, API key

**Challenge**:
Ghost asking an origin to prove it holds the app's backend key, by signing a
fresh nonce for that origin.
_Avoid_: handshake, ping

**Identity check**:
What a manifest must pass before Ghost uses it: it is signed with the identity
key it names, no earlier than the newest one the site has seen for the app, and
the app's origin answers the challenge, unless the site trusts that origin.
_Avoid_: verification, validation

### Manifests

**Manifest**:
The JSON document that describes an app to Ghost. An app serves it as a signed
manifest.
_Avoid_: config, app.json, descriptor

**Signed manifest**:
A manifest's exact bytes, signed with the app's identity key with the time it
was signed: what an app serves. Ghost only reads a manifest out of a signed
manifest it has verified.
_Avoid_: JWS, envelope, signed config

**Manifest URL**:
The address a signed manifest is served from, which the manifest itself names;
one read from anywhere else is refused. It decides where every later version of
the manifest comes from, so it is part of what a publisher approves.
_Avoid_: install URL, app URL

**Parsed manifest**:
A manifest Ghost has accepted from a signed manifest it verified. Its paths are
resolved against its manifest URL, so every URL in it is absolute. Manifests are
compared and kept in this form.
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
The host an app's page loads from: where the app runs. It is always the host
of its manifest URL, since a surface is a path resolved against it.
_Avoid_: app host, origin

**Surface origin**:
The origin of a surface's resolved URL. It is the only origin Admin talks to
for that surface: Admin ignores a hello from any other origin and addresses the
connect only to this one. The manifest lists no other origins.
_Avoid_: allowed origin, app origin

### Changes

**Change**:
One field that differs between two versions of an app's manifest, the manifest
URL included.
_Avoid_: diff, update

**Silent change**:
A change that applies without the publisher approving it again. Only the
description, the accent colour, the name of an icon Admin ships and the backend
key qualify; anything else that says who the app is, or is a URL Ghost loads or
links to, does not.
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
The window message the SDK in an app's page posts to Admin once it has loaded,
repeating it until Admin answers. It contains the SDK's version, for
diagnostics only, and an ID for the page's document (random, made when the SDK
loads). Admin uses the ID to tell whether a hello
comes from a document it already connected or from a new document.
_Avoid_: handshake, ready, init

**Connect**:
Admin's answer to a hello that comes from the frame Admin mounted and from the
surface origin. It hands the page the port that carries the rest of the app
session, and lists the calls and feature names this Admin supports, so the
page knows what an older Admin lacks. Only the first connect counts.
_Avoid_: ack, handshake

**Start**:
Admin's first call over the bridge. It sends the page the site, the staff
user's ID and role, the theme, the app session's revision and the app path. Admin
shows the page once the page has responded.
_Avoid_: init, boot, launch

**App session**:
One run of an installed app in Admin, as App Installations defines it: it
starts when Admin opens the app's page, and is pinned to the installation's
revision at that point. Each document in the frame joins it over a channel of
its own when Admin answers the document's hello. Admin ends the app session
when the installation's revision changes, so an app never runs against an
unapproved revision, and every call fails once it has ended. Not the staff
user's sign-in session.
_Avoid_: session, connection, login, token

**App path**:
A route within an app's own page, such as `/episodes/12`: the path, query and
fragment of the page's URL on the app's origin. Admin mirrors it in its own URL
so a reload or a shared link opens the same page, and loads the app's page at
it. Admin owns the history: the SDK turns each `pushState`, link and
`replaceState` into a push or a replace in Admin's history, and the frame keeps
a single entry. It starts with a single `/` and can never point outside the
app. Admin and the page both store it in the URL parser's normalised form, so
the same route is identical on both sides.
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

**Allowlist**:
The Admin API routes the fetch escape hatch allows, by method, grouped under
the scope names Permissions and auth will use (`posts:read`, `posts:write`),
in `ADMIN_API_ALLOWLIST`. Everything else is refused. Writes of posts, pages
and tags are also checked so they can't send email, set code injection or
write mobiledoc. It stands in for apps' own token, which takes the scopes over.
_Avoid_: permissions, blocklist, denylist

**Feature name**:
A name in the connect message's list for something an Admin supports beyond
its exports: a newer argument field, or a newer place an app may send. Every
such addition gets one, and the SDK refuses to send it as `unsupported` unless
Admin lists it, so a newer SDK never relies on an older Admin ignoring
something; Admin's schemas stay strict. In the other direction, a field Admin
sends never changes how an existing field is read: a new meaning gets a new
field.
_Avoid_: version, capability flag
