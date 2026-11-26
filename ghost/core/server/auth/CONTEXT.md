# Authentication and Authorization

Authentication and Authorization covers how Ghost works out who made a request
and decides what they may do. Request flows are in the
[authentication guide](../../../../docs/codebase/authentication.md), and how
the code is laid out is in the [README](README.md). Staff sign-in, sessions and
passwords have their own language in [Better Auth](better-auth/CONTEXT.md).

## Language

### Who acts

**Staff user**:
A person with a role on the site, who works in Admin.
_Avoid_: admin, author, plain "user" where a member could be meant

**Integration**:
A named set of API credentials for software that acts on the site with no
staff user behind it.
_Avoid_: app, API client, bot

**Member**:
A person signed up to the site as a reader. A member is never a staff user and
never reaches the Admin API.
_Avoid_: user, subscriber

**App**:
Software a developer runs on their own servers that shows up inside Ghost, as
[App Contracts](../../../../contracts/app-contracts/CONTEXT.md) defines it. It
acts on a site through its
[installation](../services/app-installations/CONTEXT.md), for a staff user or
on its own.
_Avoid_: integration, plugin

### Credentials

**Credential**:
What a request presents to say who it is: a session cookie, an Admin API token,
an app token or a Content API key.
_Avoid_: login, secret

**Admin API key**:
The secret that signs Admin API tokens. An integration holds one, and a staff
access token is a staff user's own. It is never sent.
_Avoid_: admin token

**Admin API token**:
A token signed with an Admin API key. Sent with the `Ghost` authorization
scheme, it is refused once its issued-at time is more than five minutes past.
The scheduler's routes take one in the URL instead, where that check is
skipped and only an expiry in the token limits it.
_Avoid_: admin key, bearer token

**Staff access token**:
A staff user's own Admin API key. Despite its name it is never sent: it signs
Admin API tokens, and a request made with one acts as that staff user.
_Avoid_: staff key

**Content API key**:
The key that identifies an integration to the Content API. It is not a secret.
_Avoid_: content token

**App token**:
An access token Ghost issues to an app for calls to the Admin API. Each is
opaque (a random string, not a JWT) and starts with `ghost_app_`. Which kind it
is comes from the OAuth client it was issued to and whether it acts for a staff
user, never from its text. Under the Better Auth engine, Ghost issues app user
tokens to app sessions, and the Admin API accepts them. The other kinds aren't
built yet.
_Avoid_: Admin API token, bearer token

**App user token**:
The app token Admin holds for an app while a staff user has it open. A request
with one is made by an app principal acting for that user, and the token ends
no later than their session.
_Avoid_: user token

**App backend token**:
An app backend's own app token, for work with no staff user behind it. Not
built yet. Earlier versions of this glossary called this the app token.
_Avoid_: backend token

**Exchanged app user token**:
A short-lived app token a backend gets in exchange for an ID token, to act for
the staff user the ID token names. Not built yet.
_Avoid_: exchanged user token

**ID token**:
What tells an app's backend which staff user is asking: a signed JWT, not an
app token. Not built yet.

### Principals

**Authentication**:
Working out which principal made a request.
_Avoid_: authorization, login

**Authorization**:
Deciding whether a principal may take an action.
_Avoid_: authentication, permission check when the whole decision is meant

**Principal**:
Whoever made a request, worked out once from its credential. Every request a
principal resolver runs on has exactly one. Some routes don't run one, such as
the Admin API's `GET /site` and the Members API.
_Avoid_: actor, caller, identity, current user

**Kind**:
What sort of principal it is: user, integration, app, internal or anonymous.
_Avoid_: type, role

**Method**:
How a principal proved who it is, such as a session or a staff access token.
_Avoid_: scheme, strategy

**View**:
The read-only facts a principal carries about its user, API key, integration or
session. A view never holds a password, an API key's secret or a session token.
_Avoid_: model, record

**User principal**:
A staff user, whether they signed in or used a staff access token.

**Integration principal**:
An integration, identified by an Admin API token or a Content API key.

**App principal**:
An app acting on the site, for a staff user or on its own. It names the app's
installation, not the app, and always has scopes. Its shape is provisional.
An app user token resolves to one, but Admin still sends an app's calls with the
staff user's session, so they resolve to that user's principal.

**Acting for**:
The staff user an app principal acts on behalf of, or no one when the app acts
on its own.
_Avoid_: impersonating, on behalf of

**Internal**:
Ghost's own code acting with no request behind it. It is allowed everything.
_Avoid_: system, admin, superuser

**Anonymous**:
A principal for a request with no credential Ghost accepts.
_Avoid_: public, guest, unauthenticated

**Resolving**:
Working out the principal from a request's credentials. On the Admin API, a
verified API key wins over the session cookie, and a request that sent an
`Authorization` header never falls back to its cookie.
_Avoid_: logging in, identifying

### Permissions

**Permission**:
One action on one object type, such as editing a post.
_Avoid_: right, privilege, ability

**Object type**:
The kind of thing a permission is about, such as `post` or `member`.
_Avoid_: resource, model

**Action**:
What a permission allows on an object type, such as `browse`, `edit` or
`destroy`.
_Avoid_: verb, operation

**Permission key**:
A permission written as `object_type:action`, such as `post:edit`.
_Avoid_: key alone (an API key is a credential), capability, permission name,
permission string

**Role**:
A named set of permissions. A staff user holds exactly one, and an Admin API
key holds at most one.
_Avoid_: group, level

**Grant**:
A role's holding of a permission. Grants are fixed in code, not stored per
site.
_Avoid_: assignment, permission row

**Granted**:
The permission keys a principal may use before its scopes are applied. A staff
user is granted what their role gives, a staff access token what its staff
user is, and an integration what its Admin API key's role gives. An app acting
for a staff user is granted what that user is. An app acting on its own is
granted exactly its scopes, but is refused on the Admin API and by `canThis`
until scopes are enforced.

**Owner**:
The one staff user who is granted every permission key.
_Avoid_: admin, superuser

**Scope**:
A permission key or wildcard that limits what a principal may do. Scopes
only narrow what is granted, except for an app acting on its own, whose scopes
are also its grant. Either way, a scoped principal never does more than its
scopes allow.
_Avoid_: permission, grant

**Scoped**:
A principal that has scopes. A principal without any is limited only by what
it is granted. An app is always scoped, so an app with missing scopes is
allowed nothing.
_Avoid_: restricted, limited

**Wildcard**:
A scope written `object_type:*`, which stands for every action on that object
type. Nothing else is a wildcard.
_Avoid_: glob, pattern

**Capabilities**:
The two sets worked out for a principal: the permission keys it is granted,
and the permission keys its scopes allow.
_Avoid_: permissions, abilities

### Decisions

**Policy**:
The code in `auth/policy/` that decides whether a principal may take an
action, from its scopes, its grant and any row rule. While a model still has a
permissible hook, `canThis` applies the scopes and then lets that hook make
the final decision.
_Avoid_: permission engine, access control, ACL

**Authorize**:
To ask the policy one question: may this principal take this action on this
object type, or on this one resource? The answer is allowed or refused.
_Avoid_: check permissions, validate

**Resource**:
The one thing a decision is about, such as a single post.
_Avoid_: object, model, row

**Row rule**:
The rule for one object type that makes the final decision about a resource.
It can narrow or widen what is granted, and runs only once the scopes allow
the permission key. None exists yet.
_Avoid_: row-level security, guard

**Permissible hook**:
The older place a model makes that final decision. Each one is due to become a
row rule.
_Avoid_: permission hook, model check

**Narrow**:
To refuse something the grant allows, as when an Author may edit only their
own posts.

**Widen**:
To allow something the grant lacks, as when a staff user edits their own
profile. A rule never widens past a principal's scopes.

**Excluded attributes**:
Fields a decision allows the request to send and then leaves out of the write.
_Avoid_: forbidden fields, protected fields

### Context

**Context**:
What an API call carries about who is making it: the principal, and the older
user and API key fields read from it.
_Avoid_: session, request

**Public**:
A context for an anonymous request or a Content API key. Nothing else that
carries a principal is public.
_Avoid_: anonymous, which is a kind of principal

**Internal context**:
A context for Ghost's own code calling an API. It skips every decision.
_Avoid_: system context, admin context

## Not this

- Sessions, device verification, staff status and passwords are defined in
  [Better Auth](better-auth/CONTEXT.md).
- How members sign in is in the
  [authentication guide](../../../../docs/codebase/authentication.md). A member
  is never a principal on the Admin API.
- `authorizeAdminApi` only refuses an Admin API request with no staff user or
  API key, or from an app with no staff user to act for. It doesn't authorize:
  what the request may do is the policy's decision.
- The Admin API accepts the `Bearer` scheme only for app tokens. No other
  credential here is sent with it.
- Scopes narrower than a permission aren't built yet. They will have names of
  their own, never an existing permission key, so until they land every scope
  is a permission key or a wildcard.
- The **scopes** an app's manifest asks for are defined in
  [App Contracts](../../../../contracts/app-contracts/CONTEXT.md), and the
  **approved scopes** of an installation in
  [App Installations](../services/app-installations/CONTEXT.md). Each is a
  permission key, never a wildcard, and **resource** there means an object
  type. For a request with an app user token, they cap the standard permission
  checks through the policy. Admin still sends an app's calls with the staff
  user's session, so its bridge holds an app to them there.
