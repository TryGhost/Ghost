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
An installed app, as [App Installations](../services/app-installations/CONTEXT.md)
defines an installation. It can act for a staff user or on its own.
_Avoid_: integration, plugin

### Credentials

**Credential**:
What a request presents to say who it is: a session cookie, a staff access
token, an Admin API token or a Content API key.
_Avoid_: login, secret

**Admin API key**:
The secret an integration holds for the Admin API. It is never sent; it signs
Admin API tokens.
_Avoid_: admin token

**Admin API token**:
A short-lived token signed with an Admin API key and sent with the `Ghost`
authorization scheme.
_Avoid_: admin key, bearer token

**Staff access token**:
A staff user's own key for the Admin API, used the way an Admin API key is. A
request made with one acts as that staff user.
_Avoid_: staff key, personal access token

**Content API key**:
The key that identifies an integration to the Content API. It is not a secret.
_Avoid_: content token

### Principals

**Authentication**:
Working out which principal made a request.
_Avoid_: authorization, login

**Authorization**:
Deciding whether a principal may take an action.
_Avoid_: authentication, permission check when the whole decision is meant

**Principal**:
Whoever made a request, worked out once from its credential. Every request has
exactly one.
_Avoid_: actor, caller, identity, current user

**Kind**:
What sort of principal it is: user, integration, app, internal or anonymous.
_Avoid_: type, role

**Method**:
How a principal proved who it is, such as a session or a staff access token.
_Avoid_: scheme, strategy

**View**:
The read-only facts a principal carries about its user, key, integration or
session. A view never holds a password, a key's secret or a session token.
_Avoid_: model, record

**User principal**:
A staff user, whether they signed in or sent a staff access token.

**Integration principal**:
An integration, identified by an Admin API token or a Content API key.

**App principal**:
An installed app. It always has scopes. Its shape is provisional, and nothing
creates one yet.

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
Working out the principal from a request's credentials. A verified key wins
over a cookie, and a request that sent an `Authorization` header never falls
back to its cookie.
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

**Key**:
A permission written as `object_type:action`, such as `post:edit`.
_Avoid_: permission name, permission string

**Role**:
A named set of permissions. A staff user holds one or more, and an Admin API
key holds at most one.
_Avoid_: group, level

**Grant**:
A role's holding of a permission. Grants are fixed in code, not stored per
site.
_Avoid_: assignment, permission row

**Granted**:
The keys a principal's roles give it. A staff access token is granted what its
staff user is, and an app acting for a staff user is granted what that user is.

**Owner**:
The one staff user who is granted every key.
_Avoid_: admin, superuser

**Scope**:
A key that limits what a principal may do. Scopes only ever narrow what is
granted; they never add to it.
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
The two sets worked out for a principal: the keys it is granted, and the keys
its scopes allow.
_Avoid_: permissions, abilities

### Decisions

**Policy**:
The one place that decides whether a principal may take an action.
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
the key. None exists yet.
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
user and key fields read from it.
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
- The Admin API doesn't accept the `Bearer` scheme yet, so no credential here
  is a bearer token.
- Scopes narrower than a permission aren't defined yet. Until they are, every
  scope is a key or a wildcard.
