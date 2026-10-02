# Editing session

`apps/admin/src/editor/session/` composes the three modules described in
[the engine README](../engine/README.md) — the save engine, the change tracker
and the slug machine — into one editing session, and is the editor's only
writer. Every title, excerpt, body, feature-image, email-subject and settings change goes
through it, and it owns everything those three modules deliberately do not:
what a save sends and what an acknowledgement may change. The save engine owns
pending work and scheduling.

## One session per post

One session per opened post, built and disposed together. Building a session
starts no timer, request or outside subscription, so a session discarded without
`dispose()` leaves nothing running. A new post always gets its own; nothing is
carried from one new post to the next. Once a create acquires an id the URL is
replaced from new to edit as a state-driven effect, with the screen keyed on the
session so the switch does not remount the editor.

The screen keeps a session while navigation stays on its post, counting the id
a create acquired and ignoring a trailing slash, whichever history entry the
navigation reaches, including one the router did not create. Any other post, a
new one included, gets a new session, so two posts opened by URL each get their
own. The editor tells the screen once its session has created its post, so the
new-post URL reached afterwards opens a new post even when the router renders
the create's URL replace and that navigation together.

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
identity — the id and the collision token — is moved by every acknowledgement
and every reload and never by a read, so the next request carries the token of
the version the session's content was built on. A settings save is no
exception: it is acknowledged only while the server still holds the canvas the
session last saved, as [What a save sends](#what-a-save-sends) describes.

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

Every edit updates the live projection. The save engine derives pending content
from that projection when the session reads its view. Staging alone does not
start a request. A canvas commit — the title's blur, the excerpt under the title,
and the feature image with its alt text and caption — dispatches `field`; a
settings-panel commit — a settings field, a manual slug or the publish time —
dispatches `settings`; body edits dispatch `autosave`. The engine owns when
these requests may run.

| Status                           | Title, body and canvas                              | Settings panel                                 |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| `draft`                          | Saved by a field commit, or after the body debounce | Saved at once, with the whole document         |
| `published`, `scheduled`, `sent` | Retained until an explicit save: Update or Cmd-S    | Saved at once, with the changed settings alone |

Tier picks outside a draft are the one settings edit staged without a commit,
as in Ember: every save of a published post writes a revision, so the picks go
out once, with the next settings save or Update, and count as unsaved work
until then.

Pending content is separate from the runnable queue. It includes edits awaiting
a commit, the autosave debounce, Update, validation, or recovery, and can
coexist with an older request in flight. A blocked document never leaves a
command in the runnable queue, so navigating away does not wait indefinitely.
The live document remains the source of truth: Update enables, the post stays
dirty, and leaving requires a save or confirmation.

All saves use the same preparation validator. An incomplete tier pairing on a
post that exists, an over-long title, excerpt, code injection or meta/social
field, an emptied author list, or a newly staged future publish time holds a
background save with a validation blocker. Body autosave, title and image
commits follow the same rule, including an already armed timer or queued
request. The editor explains why changes are waiting even when the settings
panel is closed. A saved future publish time is not itself invalid.

A post the server has not created yet is not held to the tier rule. Its saves
go ahead with the incomplete pair left out of the write and of the submitted
projection, so the acknowledgement is not authoritative for either field: the
pair stays the writer's edit across the create, whatever visibility and tier
relations the server answered with, and the next complete pair sends both.

An explicit save returns a validation failure promptly and shows the save error.
Its content stays pending; its publish/schedule/email target is not retained for
automatic retry. Correcting the document and committing requests a new save that
combines its current values. Unchanged invalid versions suppress background
retries; an explicit retry still revalidates. Unrelated edits retain the warning
until a preparation succeeds or a save attempt finds the document clean; a
warning a settings save raised also goes once a settings attempt finds the
settings back to their saved values, however much canvas is staged. Body edits on a blocked new post debounce too,
and preparation occupies the save slot without displaying “Saving…”.

Failures never discard pending content. Server validation, network errors and
authentication expiry retain their recovery policies. A collision remains
recoverable after a retry fails for a different reason. The save error's retry
repeats a failed settings save on a post that is not a draft as a settings save,
so it does not take the retained canvas with it, and sends it even when the
server refused those very values; any other failed save is retried explicitly.
A settings attempt that finds the refused settings back to their saved values
ends the refusal instead: the error goes, and the post is no longer dirty for it.
Only accepting a server reload discards outstanding local work. Successful
acknowledgement clears pending content only when the reconciled live document
is clean; edits made after submission remain pending.

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

A settings save on a post that is not a draft sends the id and the collision
token, the settings fields that differ from the saved copy and a staged publish
time, and beside them the canvas as it was last saved: the title, the slug (the
writer's own once a manual edit has moved it), the body, the feature image, and
the excerpt while it is edited under the title. Core checks the collision token
when a write changes the post's own row or its tags, authors or tiers, but not
when it changes only the fields Core stores beside the post: the meta, Facebook
and X fields, the email subject and the feature image's alt text and caption.
The saved canvas makes a settings save collide when another writer has changed
the canvas since, rather than be acknowledged with their token and their canvas;
when nobody has, it changes nothing. The canvas the writer has staged and the status stay out of
the request, so the canvas waits for Update and the server keeps the status it
holds. The excerpt is canvas while it is edited under the title and a settings
field while the sidebar owns it; whichever route last staged it decides.

The whole payload is validated before the request: the title, then the settings
rules above in their own order, then the publish time, then the author list. A
settings save skips the rules of what it leaves for Update, the title and a
canvas excerpt, so an unfinished canvas edit does not hold it. A
failure there is typed exactly as one the server would have reported, so the
save fails with that kind and sends nothing. Each length is counted as the
server counts it: the title trimmed, with an emoji and its presentation selector
as one character, and every other field by code point.

A failure the transport reports is mapped onto the same kinds, so the engine's
state machine reads them the same way: an `UPDATE_COLLISION` code becomes
`conflict`; a session-expired, unauthorized or 401 failure becomes
`session-invalid`; a host-limit failure becomes `host-limit`; an unreachable
server, a maintenance response and a timeout become `transport`; a validation
failure, a payload the server refuses as too large and a 422 become
`validation`, because a payload refused outright has to suppress background
saves the way a validation failure does or it retries on every edit; a 404
becomes `not-found`; and anything else becomes `unknown`.

A `validation` or `host-limit` failure the server reports carries the server's
reason as its message. The server sends that reason as the error's context
beside a generic summary, and the summary is used only when there is no context.
The save-error banner shows a host limit's reason with its "please upgrade"
phrase linked to the host's upgrade screen, `/pro` unless the host configures
another, and keeps the content and the banner's retry.

## Adopting the server's answer

Query responses go to the tracker's saved document and save responses to its
acknowledgement transition, never the reverse. The session passes the projection
the request submitted and the full record the server acknowledged, so the
tracker's three-way rebase has a stable base for every field the request
carried.

A read is adopted only at the collision token the session holds. Core leaves the
token alone unless a column of the posts row changes, so such a read can still
carry another writer's tags, authors or tiers, or fields Core stores beside the
post: the meta and social fields and the feature image's alt text and caption.
The session takes the read as its saved copy, and the rules below decide which
settings fields, alt text and caption the document adopts. A read at any other
token is another writer's version, or the session's own save read before its
acknowledgement landed; its content is not in the document, so the session keeps
its token and its saved copy, marks nothing dirty and starts no save. The next
save carries the token the writer's content was built on, together with a
canvas — the writer's own, or the saved copy for a settings save — so where the
newer version's canvas differs the server refuses it with a collision instead
of letting it overwrite that version; reloading the document is the way onto
it. A refused read is offered again
whenever the engine moves on, so a read of a save that was in flight is adopted
once that save's acknowledgement has landed and the session holds its token.

Each acknowledged save also writes the record the server answered with into the
screen's query, whole and in the shape a read has, so opening the post again
before the read that follows the save has landed starts from the saved copy and
its token rather than from the copy that predates the save. A later version a
read put there before the answer arrived is kept.

A save writes a title and slug the writer never typed — the request's own
default title, the slug derived from the title — and the server may normalize
both again. The live document adopts each, before the acknowledgement is
applied, and only where the writer has not typed past the value since, which is
the rule the rebase itself uses. Any difference from the submitted value is
adopted, so a title the server trimmed replaces the input's text, while whether
the writer has typed past it compares the title trimmed. Skip this and the
rebase keeps the superseded local value: the post reads as diverged from its own
saved state for the rest of the session. Adopting is not an edit, so it must not move the version the
request was built against. Normalized title and slug acknowledgements are
synchronized back into the slug machine through its ownership-preserving
transition, so later saves do not resend a superseded value or freeze derived
slug behavior. Only what the request carried is adopted: a settings save sends
no title, so the title its acknowledgement holds answers nothing and a title
staged on the canvas stays staged.

Settings fields follow the same rule. A field a section does not own is carried
in the projection but never sent. Successful saves and reverted edits release
ownership, so a later read or acknowledgement adopts the server's value and an
unrelated save cannot overwrite it. An outstanding edit keeps the writer's value
through a refetch or a rejected save, and an acknowledgement adopts the server's
normalized value only where the writer has not edited past the submitted value.
Undoing a field while its save is in flight also stays staged, even if a read
at the held token carries another value meanwhile: the next save persists the
undo. Ownership is decided by which fields the writer moved and when, never by
comparing the live document against a pre-save snapshot, so adopting one refetch
inside a save window does not stop a later one from being adopted too, and
re-emitting a value the field already holds does not claim it. The feature
image's alt text and caption are adopted by the same rules, and the feature
image field shows what was adopted; a caption the writer is in takes it only
once they leave it, so it never changes under their cursor.

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
The session does not persist a proposal itself: an applied manual proposal is
patched into the live document and then dispatches a settings save, as any
settings-panel field does, so it is saved at once whatever the status.

## Restoring a revision

A restore writes the revision's body, title, excerpt, feature image, alt text
and caption into the live document and saves them explicitly, so the server
keeps a version of what was replaced. The tracker is told about the restore only
once that save lands. A save that is refused puts the post back as it was —
content, title and slug — and reports the failure. A restore that meets an
expired session waits behind the sign-in dialog, which sits above the history
modal, and lands once the session is back; abandoning the sign-in rolls it back.

A restore is a document boundary for the slug: the restored title is not a title
the writer typed, so the slug is kept rather than moved to it, and whether it
goes on following the title is re-read from the slug itself.

## Keeping a local copy

While a draft holds unsaved work, the session keeps a copy of it in the
browser's local storage, so work that never reached the server can be brought
back from the restore screen. A copy carries the title, slug, body, excerpt,
feature image with its alt text and caption, authors and tags, and is stored
under `post-revision-<post id>-<timestamp>`; `draft` stands in for the id until
the post has been created.

Only unsaved changes to what a copy carries count. The body is judged by the
tracker's verdict: a body that differs from the saved copy only by Koenig's
load-time normalization matches the hidden instance's baseline, and a change
that arrives before that baseline has been reported waits for it, so opening a
post leaves no copy behind. If the hidden instance fails, the body is compared
with the saved copy alone. The other carried fields are judged by their own
compare; a change to a field a copy does not carry, such as the meta title, does
not write one, and neither does a save that failed. Published, scheduled and
sent posts are never copied.

The first change writes a copy at once. After that at most one copy a minute is
written, carrying the newest draft, and a copy identical to the last one written
is skipped. A copy still waiting for the minute is dropped once a save leaves
nothing unsaved or the post leaves draft. A copy is written straight away when
the page is hidden or closed, when the session is disposed holding unsaved work,
before a revision from the post's history replaces the body, and when a save
stops on a conflict, a deleted post, an expired session or a crash; a conflict
that failing saves keep re-entering is copied once. A save that keeps failing is
otherwise left to the minute's pace, and nothing is copied while a revision's
restore is being saved.

Each post keeps its newest five copies. A post that has not been created keeps
at most five from one session; once it is created those copies are removed, and
any work the create did not carry is written again under the new id. When
storage is full, the oldest copies of any post are removed until the new one
fits. Storage never interrupts editing: a copy that cannot be written is
reported, not thrown.

## Reloading the document

A reload replaces the whole document with the server's copy when the writer
chooses it. The tracker is loaded afresh, so the hidden instance's old baseline
goes with it; the identity adopts the fresh collision token, the editor surface
re-seeds both Koenig instances, and the save engine validates the candidate
before any of those replacements happen. Its retained collision record authorizes
recovery even after a retry fails for another reason; an active save or frozen
authentication attempt must settle before the document can be replaced. The
replacement completes before recovery is announced to subscribers, so an edit
made from that notification belongs to the new document and is preserved. The
read is its own request, never a refetch of the query the screen rendered from,
so nothing is replaced until the session has accepted the copy. A reload that
fails leaves the halt, the content and the banner exactly as they were. A reload
that succeeds seeds the screen's query with the accepted document, so a quick
close and reopen cannot resurrect the version it first read.

The screen's query also refetches on its own, after every save that lands and
on reconnect once it is stale. Only a read that never produced the post
replaces the screen: with sign in when the session has expired, and otherwise
with the load error or a missing post. Reopening a post whose stale copy is
still cached therefore shows that copy even when its refetch fails.
Once the post is on screen, a refetch that fails leaves the editor, the session
and the unsaved content where they are, and the next save reports a deleted
post, an expired session or a collision itself.

The read that opens the post also decides whether the writer may edit it, and
whether a post stored only as mobiledoc must be converted first. An Author or
Contributor who is not among its authors, or a Contributor on a post that is no
longer a draft, is returned to the list. A post reopened from a stale cached copy
shows that copy while its refetch runs, and the refetch decides. Once that read
has settled, later reads decide neither: a refetch that takes away the writer's
access, or that brings a version stored only as mobiledoc, leaves the editor and
the unsaved content where they are, and the next save shows the server's refusal
or the collision.

What a halted queue looks like is the session's caller's decision, not the
engine's: `reauth-pending` and `conflict` are states, not UI. The writer gets a
way back in and the content stays untouched.

## Signing in again without leaving

A save that finds the session gone freezes the queue and opens a sign-in dialog
over the editor (`reauth-dialog.tsx`); the content stays on screen behind it and
nothing navigates. The writer's email is already filled in and only the password
is asked for; the credentials go to the session endpoint and nowhere else. A site
that requires a sign-in code turns the dialog into a second step that asks for
the emailed code. That step's Resend emails a fresh code and a toast confirms it;
Resend then reads Sent and stays disabled for fifteen seconds. A wrong password or
code, or a resend that fails, is named inside the dialog and nothing else
changes. Once the session is back the held save goes out on its own; a
status change it was carrying, such as a publish, is re-confirmed rather than
sent unasked. Clicking outside the dialog does nothing; Escape or Cancel abandons
it, which moves the queue to the save-error banner with the content kept, and the
banner's retry brings the dialog back.

## The view React subscribes to

The session publishes one cached view — the engine state, pending-save
blocking information,
dirtiness, title, slug, settings, publish time, and the feature image's alt
text and caption — and republishes it only when one of those values changes.
Pending content is read on demand after
tracker changes, including save errors that make a clean document dirty. The nested settings and publish-time
references are kept stable across engine events, so body edits need no new React
snapshot while the rendered values stay the same. That makes the view suitable
for `useSyncExternalStore` and lets it stand in for those values as a dependency.

## Leaving the editor

While the post holds unsaved work, every way out of the editor is put to the
save engine: a link, the browser's Back and Forward buttons, and any other
change to the URL's hash. The engine finishes or saves what is outstanding and
answers either that leaving loses nothing, and the navigation goes ahead, or
that the writer has to confirm it. Until then the URL stays on the editor. The
writer is asked to confirm instead when the engine fails to answer or has not
answered within twenty seconds, which is longer than the transport keeps
retrying a save, so a stalled save cannot pin the URL. The deadline does not run
out while the writer is signing in again: signing in lets the leave go ahead,
and cancelling asks. Once the deadline has run out, the next way out asks at
once until the engine moves on. A
Back or Forward is undone as it happens and replayed once the writer may leave,
so they land on the entry it reached. Undoing it puts the editor back directly
above that entry: a held Back drops the forward history, and a Forward or a hash
change from outside that the writer cancels leaves its destination directly
below the editor, where the next Back goes. A URL that differs only by a
trailing slash is the same screen, not an exit. A clean editor leaves at once, a
tab close or reload gets the browser's own prompt, and the URL replace after a
create is not an exit.

Only the first way out is held. Until the writer may leave or chooses to stay, a
click on another link does nothing and another Back, Forward or hash change is
undone, so leaving still goes where they first asked. The router's own links are
the exception when the held exit is one of them: the router keeps only the
latest, so leaving goes to the last one clicked. When a Back or Forward is held
and another change lands anywhere but the entry it reached, that entry is no
longer directly below the editor once the change is undone, so leaving puts its
URL in place of the editor's entry instead. The undone entries stay in the
history, so Back after leaving can step through them. A change to the URL that
keeps the editor's screen, such as dropping a trailing slash, stays in the
address bar and leaves the held exit in place.

## What the session reports

Failures never reach the writer as thrown errors; the session reports them. Every
request that ran and failed is reported once, with the command it ran, the
error, whether the post already had a server id, the post's persisted status,
the id, and how long the request took. Queued work a failure dropped is not
reported on its own. An expired session is reported only when re-authentication
is abandoned, not when it is retried. A leave the engine answers with a
confirmation is reported with the reason codes the tracker holds the post dirty
for; one the editor asks about because the engine missed its deadline is not.
A draft disposed with a title but a slug still derived from the default title is
reported as an error. A throwing subscriber or slug listener is reported as an
error, and so is a slug edit the generator rejected. A local copy that storage
refused is reported with a `localRevisions` tag naming why: `quotaExceeded` when
older copies had to make room, `quotaExceededNoSpace` when nothing could, and
`saveError` for any other failure.

Sentry receives these through the editor's own reporter, with the response
status and URL when the transport answered. Validation failures, host limits and
an unreachable server are not sent: they are the writer's or the host's to act
on. A failed request that took more than two seconds is sent as a second event
with its timing. Every error banner the writer is shown — a failed save, a
collision, a deleted post — is also sent once as a message carrying the text
they read. A Koenig instance that crashes its error boundary is reported as a
Lexical failure. Sentry stays optional: without a DSN the calls are no-ops, and
an error is still logged to the console.

## The autosave debounce

The autosave debounce is a boot value: the session reads it from the config the
app booted with and hands the engine a getter, which the engine calls at each
restart of the debounce. Anything but a finite positive millisecond count leaves
the engine's own default standing. Ghost's config allow-list never sends the
value, so in practice only the acceptance harness sets it, through its boot
override.
