# Editing session

`apps/admin/src/editor/session/` composes the three modules described in
[the engine README](../engine/README.md) — the save engine, the change tracker
and the slug machine — into one editing session, and is the editor's only
writer. Every title, excerpt, body, feature-image and settings change goes
through it, and it owns everything those three modules deliberately do not:
what a save sends, when it runs, and what an acknowledgement may change.

## One session per post

One session per opened post, built and disposed together. A new post always gets
its own; nothing is carried from one new post to the next. Once a create
acquires an id the URL is replaced from new to edit as a state-driven effect,
with the screen keyed on the session so the switch does not remount the editor.

Requests are made without the transport's session-expiry redirect, so an expired
session is surfaced in place rather than navigating away from unsaved content.

`dispose()` ends the session: what is in flight is abandoned, every later write
is dropped, outstanding slug waits are released and the listeners are cleared.
Disposal is deferred by a tick, because StrictMode tears an effect down and sets
it up again in the same commit and that must not dispose a live session.

## The live projection

The session holds a live projection of the editable post beside the tracker and
patches it on every change, so a snapshot can be read synchronously at any
moment. A monotonic edit version moves with it, and each settings field records
the version the writer last moved it at — adopting a server value is not an
edit, so a snapshot of the live values could not answer that question.

A blank title is held in the projection as the default title while the input
stays empty, so a post persisted under that title does not read as permanently
diverged from what the writer sees. The title input never shows it; substituting
it on the way to the server is the save engine's own duty. The persisted
identity — the id and the collision token — is replaced from every
acknowledgement, so the next request carries the token the server just issued.

The snapshot the engine reads is that projection reduced to what the queue
reasons about: the id with its collision token, both `null` until the create is
acknowledged, the status and publish time, the title and slug, the dirty bits,
whether anything has changed since the last revision, and the edit version.

Three fields are deliberately absent from the settings projection. Status and
publish time belong to the save engine's command target: every request reads the
publish time off the snapshot rather than the projection, so a field patch would
be overwritten before the request is built. The publish time therefore has a
writer of its own, which stages it on the session, and the snapshot then reports
it. The slug belongs to the slug machine, which authors it on every save; a
manual edit is routed through the machine's own transition, so a slug written as
a field patch would be dropped before the request is built.

## Staging and committing

A settings field is staged with one call and committed with another. Staging
writes the value into the live projection and nothing else; committing puts it
through the one save policy gate. What that gate does depends on the post's
status.

| Status                           | On a field commit                                                   | Persisted by                           |
| -------------------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| `draft`                          | dispatches the save engine's `field` intent, as a title commit does | the field save itself                  |
| `published`, `scheduled`, `sent` | nothing — the value is staged in the live document                  | the next explicit save (Update, Cmd-S) |

The gate also holds a draft's field save back while a value it would send is not
yet valid: an incomplete tier pairing, a meta or social-card title or
description past its column width, an author list the writer emptied, or a
publish time that has not passed. The value stays staged, the section says why,
and the next save the writer asks for is refused with the same message. A
draft's body autosave is not held back the same way: it runs, and the same rules
fail it before any request is sent, so the engine reports that error until the
value is valid again. The save banner carries the message whether or not the
sidebar is open, so closing the panel does not hide it.

Staging is not a weaker form of saving. A staged value lives in the same live
document as the body, so it counts everywhere unsaved work counts: the post
reads dirty, the Update button enables, and the leave guard asks before the
writer navigates away. The save engine independently refuses background saves
for anything that is not a draft, so the gate states the policy rather than
being its only enforcement.

Failures leave staged values alone. A rejected explicit save keeps them in the
live document and surfaces the error in the editor's banners; a collision goes
to the conflict banner, and only the writer choosing the server's copy discards
what they staged.

## What a save sends

Every request carries the title, slug and body, the feature image with its alt
text and caption, and the status and publish time the save engine's command
resolved. A create adds the current user as the post's author, because Core
refuses an Author's or a Contributor's create without one; an update adds the id
and the collision token the request was built at. A request that would have to
go without a token is refused before any IO: without one the server skips its
concurrency check and the save overwrites whatever landed meanwhile.

Settings fields enter the payload only while they differ from the saved copy,
and each is written as its identity alone rather than as the record the field
displays: authors and tags by id, or a tag the writer typed by its bare name,
and a tier by the record whose id the API reads. `visibility` and `tiers` travel
as a pair whenever the post is restricted to specific tiers and either of them
changed, because the write contract drops a `tiers` visibility that arrives
without tiers. The publish flow's email extras — the newsletter, the recipient
segment and the email-only flag — ride on the command that carried them rather
than on the projection.

The whole payload is validated before the request: the settings rules above in
their own order, then the publish time, then the author list. A failure there is
typed exactly as one the server would have reported, so the save fails with that
kind and sends nothing.

A failure the transport reports is mapped onto the same kinds, so the engine's
state machine reads them the same way: an `UPDATE_COLLISION` code becomes
`conflict`; a session-expired, unauthorized or 401 failure becomes
`session-invalid`; a host-limit failure becomes `host-limit`; an unreachable
server, a maintenance response and a timeout become `transport`; a validation
failure, a payload the server refuses as too large and a 422 become
`validation`, because a payload refused outright has to suppress background
saves the way a validation failure does or it retries on every edit; a 404
becomes `not-found`; and anything else becomes `unknown`.

## Adopting the server's answer

Query responses go to the tracker's saved document and save responses to its
acknowledgement transition, never the reverse. The session passes the projection
the request submitted and the full record the server acknowledged, so the
tracker's three-way rebase has a stable base for every field the request
carried.

A save writes a title and slug the writer never typed — the request's own
default title, the slug derived from the title — and the server may normalize
both again. The live document adopts each, before the acknowledgement is
applied, and only where the writer has not typed past the value since, which is
the rule the rebase itself uses. Skip this and the rebase keeps the superseded
local value: the post reads as diverged from its own saved state for the rest of
the session. Adopting is not an edit, so it must not move the version the
request was built against. Normalized title and slug acknowledgements are
synchronized back into the slug machine through its ownership-preserving
transition, so later saves do not resend a superseded value or freeze derived
slug behavior.

Settings fields follow the same rule. A field a section does not own is carried
in the projection but never sent. Successful saves and reverted edits release
ownership, so a later refetch can adopt someone else's change and an unrelated
save cannot overwrite it. An outstanding edit keeps the writer's value through a
refetch or a rejected save, and an acknowledgement adopts the server's
normalized value only where the writer has not edited past the submitted value.
Undoing a field while its save is in flight also stays staged, even if that
save's refetch arrives before its acknowledgement: the next save persists the
undo. Ownership is decided by which fields the writer moved and when, never by
comparing the live document against a pre-save snapshot, so adopting one refetch
inside a save window does not stop a later one from being adopted too, and
re-emitting a value the field already holds does not claim it.

An acknowledgement also retains fields edited after submission that the request
did not carry. A matching refetch may temporarily make such a field look saved,
but it cannot grant the earlier request ownership of that edit. The session
reapplies these values to the tracker after its rebase so they remain dirty
against a disagreeing acknowledgement and enter the next save. A matching
acknowledgement still releases the edit and supplies server-owned relation
metadata.

## The slug

The session supplies the slug machine's generator port and its wait. The port
sends the trimmed text the machine passes it — a title or a manual candidate —
to the slug endpoint together with the post id, so the server does not count the
post's own slug as a collision. The wait resolves once the latest manual
submission has settled, which is what stops an explicit save from sending the
old URL while the generator is still answering; a pending edit counts as unsaved
work until then, and a reload or disposal releases an obsolete wait.

Only a draft's title commit drives generation, so a published URL does not move
under the writer. A slug is regenerated whenever the post has none, for any
status, including after the default title has been substituted for a blank one.
The session does not persist a proposal itself: an applied proposal is patched
into the live document and then goes through the same gate as any other field,
so a draft saves it and every other status stages it until Update.

## Restoring a revision

A restore writes the revision's body, title, excerpt, feature image, alt text
and caption into the live document and saves them explicitly, so the server
keeps a version of what was replaced. The tracker is told about the restore only
once that save lands. A save that is refused puts the post back as it was —
content, title and slug — and reports the failure. A restore that meets an
expired session is rolled back rather than left frozen, because the re-auth
controls are behind the history modal.

A restore is a document boundary for the slug: the restored title is not a title
the writer typed, so the slug is kept rather than moved to it, and whether it
goes on following the title is re-read from the slug itself.

## Reloading the document

A reload replaces the whole document with the server's copy when the writer
chooses it. The tracker is loaded afresh, so the hidden instance's old baseline
goes with it; the identity adopts the fresh collision token, the editor surface
re-seeds both Koenig instances, and the save engine validates the candidate
before any of those replacements happen. The read is its own request, never a
refetch of the query the screen rendered from: a failing refetch puts that query
into an error state and replaces the editor, taking the unsaved content and the
way to copy it out with it. A reload that fails leaves the halt, the content and
the banner exactly as they were. A reload that succeeds seeds the screen's query
with the accepted document, so a quick close and reopen cannot resurrect the
version it first read.

What a halted queue looks like is the session's caller's decision, not the
engine's: `reauth-pending` and `conflict` are states, not UI. The writer gets a
way back in and the content stays untouched.

## The view React subscribes to

The session publishes one cached view — the engine state, dirtiness, the title,
the slug, the settings fields and the publish time — and republishes it only
when one of those values changes. The nested settings and publish-time
references are kept stable across engine events, so body edits need no new React
snapshot while the rendered values stay the same. That makes the view suitable
for `useSyncExternalStore` and lets it stand in for all six values as a
dependency.

## The autosave debounce

The autosave debounce is a boot value: the session reads it from the config the
app booted with and hands the engine a getter, which the engine calls at each
restart of the debounce. Anything but a finite positive millisecond count leaves
the engine's own default standing. Ghost's config allow-list never sends the
value, so in practice only the acceptance harness sets it, through its boot
override.
