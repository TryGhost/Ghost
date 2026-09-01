# Member Account

Member Account covers the member's own view of their own record: what Ghost hands
a signed-in member about themselves, and what it accepts back from them.

## Language

**Account**:
A member as they see themselves. The same row a staff member reads through the
Admin API, projected for its subject rather than for an observer. An account is a
viewpoint on a member, not a second record.
_Avoid_: Profile, member payload

**Member**:
The record itself, and the entity every other part of Ghost means by the word.
Reading a member is not reading an account; the two carry different fields, in
both directions.
_Avoid_: User, subscriber

**Projection**:
The set of fields one audience may see or set. Named and declared rather than
applied ad hoc at each call site, so that what an audience receives is a stated
contract instead of the residue of whichever pick ran last.
_Avoid_: Serializer, allowlist, whitelist

**Public projection**:
The account projection: what a member receives about themselves over their own
session. Not a subset of the admin one — `firstname` and `paid` exist only here.
_Avoid_: Member fields, safe fields

**Admin projection**:
What staff receive about a member through the Admin API, assembled by
`MemberBREADService`. Owned there, named here only to say that this module does
not touch it.
_Avoid_: Private projection, internal fields

**Query**:
A read against the tables this module owns, returning flat rows. Every query takes
a list of member ids and returns rows carrying the id they belong to, so the same
query serves one member and a page of them.
_Avoid_: Fetch, loader

**Decode**:
Turning rows into the payload: grouping them by member, supplying the literals a
granted subscription is made of, and asking other domains for what they own.
_Avoid_: Hydration, assembly, mapping

## Shape

`schema.ts` describes rows, `queries.ts` reads them, `models.ts` turns them into
an account, `serializers.ts` writes an account the way the API spells one, and
`service.ts` is what an endpoint calls. `commands.ts` holds what a member may ask
to change, one command per request rather than one list of writable columns.

The model in the middle is what lets storage and the wire move independently. A
response key cannot be withdrawn once clients read it, so the wire shape is a
promise; a column can be added or renamed, so the row shape is not. Neither is
free to drag the other along.

The serializer is written by hand rather than run through a key converter, because
half of what an account carries belongs to other domains — an offer, an
attribution, what the next payment comes to — and arrives already in the shape
those domains publish, some of it camelCase. Converting keys wholesale would
rewrite them into something no client has been sent.

Collections are separate queries rather than one statement. A member has two
independent collections, and joining both returns their product; the alternative
is JSON aggregation, which is spelled differently in MySQL and SQLite and which
MySQL will not let state an order. Split this way every query compiles identically
for both engines, and the newsletter order lives in SQL where it belongs.

What the queries do not read is anything another domain owns. An offer carries its
own redemption counts and an attribution resolves a URL through routing
configuration rather than a column, so both are asked for during decode. The
unsubscribe link is an HMAC over a secret, and the avatar is a gravatar URL; both
are supplied to the codec rather than computed inside it.

`index.ts` is a barrel rather than a composition root: the service's collaborators
are built inside `members-api.js` and handed to it there, next to
`MemberBREADService`, so there is no boot step of its own to own.

## Boundaries

This projection serves the members API that Portal reads, and nothing else yet.

Identifying a signed-in member is a different question and still goes through the
staff read. A session needs `transient_id` and `last_seen_at`, which a member is
deliberately never shown, so widening this projection to cover it would stop it
being the member's view. That surface wants a member-session projection of its
own, decoupled from this one.

The account projection is applied here. Three other surfaces narrow a member for
their own audiences and keep doing so at their own call sites: the theme
`@member` data (a versioned part of Ghost's theme API), the newsletter preference
endpoints (authenticated by uuid and HMAC rather than by session), and the
comments author shape. Consolidating them is a decision this module does not make,
and their field lists are deliberately not copied here — a copy that nothing
checks against the call site it describes goes stale while still reading as
authoritative.
