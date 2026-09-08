# Post settings sidebar

`apps/admin/src/editor/settings/` holds the settings panel beside the post
editor: the frame, its header toggle, and the sections that edit a post's
non-body fields. Nothing here talks to the API. Every field goes through the
editing session, which is the only writer.

## Save policy

A settings field is committed through one gate, `commitField()` on the session.
What that gate does depends on the post's status.

| Status                           | On a field change                                                              | Persisted by                           |
| -------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| `draft`                          | dispatches the save engine's `field` intent, as a title or excerpt commit does | the field save itself                  |
| `published`, `scheduled`, `sent` | nothing — the value is staged in the live document                             | the next explicit save (Update, Cmd-S) |

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

The sections are added one at a time. A field a section does not yet own is
carried in the session's projection but never sent. Settings, including the
excerpt, enter the save payload only while they differ from the saved copy.
Successful saves and reverted edits release ownership, so a later refetch can
adopt someone else's change and an unrelated save cannot overwrite it.

An outstanding edit keeps the writer's value through a refetch or rejected save.
An acknowledgement adopts the server's normalized value only where the writer
has not edited past the submitted value. Undoing a field while its save is in
flight also stays staged, even if that save's refetch arrives before its
acknowledgement: the next save persists the undo. Ownership is decided by which
fields the writer moved and when, never by comparing the live document against a
pre-save snapshot, so adopting one refetch inside a save window does not stop a
later one from being adopted too, and re-emitting a value the field already
holds does not claim it.

An acknowledgement also retains fields edited after submission that the request
did not carry. A matching refetch may temporarily make such a field look saved,
but it cannot grant the earlier request ownership of that edit. The session
reapplies these values to the tracker after its rebase so they remain dirty
against a disagreeing acknowledgement and enter the next save. A matching
acknowledgement still releases the edit and supplies server-owned relation metadata.

Three fields are deliberately absent from the settings projection. Status and
publish time belong to the save engine's command target: every request reads the
publish time off the session's snapshot rather than the projection, so a field
patch would be overwritten before the request is built. The Publish date section
therefore stages the publish time on the session itself, which the snapshot then
reports. The slug belongs to the slug machine, which authors it on every save;
the URL section routes a manual edit through the machine's `slugEdited`, so a
slug written as a field patch would be dropped before the request is built.

## Sections

`SETTINGS_SECTION_ORDER` in `sections.ts` is the full running
order, including sections that have not been built yet. An id with no entry in
the component's `sections` map renders nothing, so adding a section is a matter
of filling its slot rather than deciding where it goes.

Role gates live with the section, not with the frame: every role that can open
the editor can open the sidebar, and a section the writer's role cannot write is
the part that is left out.

The URL section edits the slug, which is not a settings field: a manual edit
goes to the slug machine, and only a proposal the machine applies reaches the
live document, where the save policy above then decides whether it is persisted
or staged. A superseded proposal is ignored, and a generator that fails or
answers blank leaves the slug alone: the input reverts to whatever the machine
still holds and the section says the URL could not be updated, marking the input
itself invalid, so a lost edit is never silent. The input is disabled while a
proposal is in flight. Because an applied edit makes the slug the writer's, a
later title change no longer moves it. The preview
under the input is the site URL without its scheme, then the slug, both
slash-terminated. The section is the slug and that preview and nothing else: it
does not link out to a published post, and a sent post previews its site URL
like any other rather than the separate email URL it also has.

A manual proposal participates in the save engine's slug wait, so Update or
Cmd-S cannot save the old URL while the generator is still answering. Pending
manual edits count as unsaved work for the navigation and tab-close guards.
A draft's save on leave waits for the proposal; other statuses ask before
discarding it. A document reload releases waits on obsolete requests, and a
response arriving after reload or disposal cannot patch the live document.

Tags are a relation rather than a value, and the section writes them as one:
the field holds the post's tags in order, because that order is the
`sort_order` Ghost stores and the first public tag is the post's primary tag.
Contributors do not get the section.

Each tag reaches the save as its identity and nothing else — the id of one the
site already has, or the bare name of one the writer typed. The server keeps a
tag relation's name and slug and writes them onto the tag row, so sending back
the record the post was read with reverts a rename made since; the record stays
in the field, where the chips are drawn from, and never enters the payload. A typed name is created
by the post's own save, so an abandoned edit leaves nothing behind, and a
leading `#` reads as an internal tag in the field before the save because that
is the rule the server applies. Two tags can share a name and differ only by
slug, so what makes them the same tag is the id whenever both sides have one.

The list offers the first hundred tags matching what is typed, in name order.
Narrowing the search is how the rest are reached. Enter takes the highlighted
row, and so does Tab once something is typed; Tab through an empty field moves
on. Escape closes the list and leaves the term where it was typed. A chip is
removed by clicking it, or with Backspace on an empty field.

The excerpt is the one field with two homes. When the inline excerpt is on it
renders under the title and the sidebar leaves it out; when it is off the
sidebar owns it. Either way the same session binding is behind it.

## Publish date

When the post is published, edited in the site's timezone and carried as a UTC
instant. A post that has no publish time yet shows the current moment, and only
an edit stages a value, so an untouched draft still leaves the time to the
server. The date is chosen from a calendar and the time typed as `HH:mm`; an
unparseable time returns to the value already held. Both fields commit at minute
granularity, so a change never leaves stale seconds behind.

A staged time is the writer's unsaved work like any other field: the post reads
dirty, Update enables and the leave guard asks. What persists it is the same
gate as the rest of the sidebar, so a draft saves it on its own and every other
status holds it until Update.

The calendar stops at today, and a draft's or published post's time may not be
the current moment or later. Choosing one leaves the value staged and shown with
`Please choose a past date and time.` beside the fields; no field save runs while
it stands, and a save the writer asks for is refused with the same message, which
the status line and the save banner carry. A sent post is exempt from the rule
and is re-timed like a published one.

A scheduled post's fields are disabled and carry `Use the publish menu to
re-schedule`: its time is the publish flow's to move, and the section says so
rather than offering a second route to it. Once a scheduled time has passed the
section reads `Publish date` again and drops the note, though the fields stay
disabled until the server moves the post to published.

Every role that can open the sidebar can set the publish date. It is not one of
the Owner, Administrator and Editor fields.

## Access

Access is two coupled fields, `visibility` and `tiers`, and only an Owner,
Administrator or Editor sees them. A post carries no visibility until its first
save applies the site default, so the select shows `default_content_visibility`
until then. Re-choosing the value already shown is not an edit and sends
nothing. Choosing anything other than `Specific tier(s)` clears the tiers it
granted. The tier list is every one of the site's paid
tiers, active ones before archived, and it loads only while `Specific tier(s)`
is the choice. Reads carry tier relations for Public, Members and Paid posts;
the free tier that comes with Public and Members reads is excluded from the
selection, and a tier ID without type metadata is preserved.

The write contract drops `visibility: 'tiers'` whenever no tiers accompany it,
so sending that pairing would be answered with the post's unchanged visibility
and the writer's choice would snap back. An empty tier selection is therefore
staged like any other edit but never sent: the section asks for at least one
tier, a field change does not save while the pairing is incomplete, and a save
the writer asks for is refused with the same message, which the status line and
the save banner carry. Because the pairing is staged rather than held in the
panel, it survives closing the sidebar, enables Update and is what the leave
guard asks about. A create with untouched access settings still uses the server
default; an explicit tier selection must include a tier even on the first save.
Everything that is committed goes through the same gate as the rest of the
sidebar, so a draft saves it and every other status stages it.

When either access field changes to specific tiers, the save submits both
visibility and the tier list, including tier IDs the writer never touched. A
Public or Members read carries every tier the site has and a Paid read carries
every paid tier, archived ones included, so switching one of those posts to
`Specific tier(s)` selects every paid tier on the site, which a draft grants in
the save that follows the switch. Once saved, an unrelated edit sends neither
access field.

Koenig cards read the post's access from the editor's card config, which follows
the live field rather than the saved record: a staged visibility changes what
the cards describe before any save.

## Template

The theme decides which templates a post may render with, so the section is the
active theme's list and nothing else: its slugless templates, by name, under a
Default that stands for the post carrying no template. A template the theme no
longer offers reads as the default. A theme with no such templates leaves the
section out entirely, and every role that can open the sidebar sees it.

A theme may also bind a template to one post URL. Where the post's slug matches
one, the theme applies that template whatever the field holds, so the select is
disabled and names the template the URL picked. The field is committed through
the same gate as the rest of the sidebar: a draft saves it, every other status
stages it until Update.

## Show title and feature image

A page can render without its own title and feature image, and only a page: the
field has no meaning for a post, so the section is left out there. Every role
that can open the editor sees it. The field goes through the same gate as the
rest of the sidebar, so a draft saves it and every other status stages it, and
the editor's cards read the live value rather than the saved one.

Honouring the choice is the theme's job. When the active theme's report says its
page-builder helper is missing and the writer has turned the setting off, the
section says so and links to the theme documentation. The signal comes from the
theme report's errors and warnings alike; a backend that reports nothing is
taken to support the helper, so no warning is shown. The report is only read
once the choice is off, and never for a Contributor, who cannot read it.

## Open and closed

The toggle sits in the editor header, and the panel starts closed on every
editor entry. There is no keyboard shortcut for it.

Below the `lg` breakpoint the panel overlays the editor from the right rather
than narrowing it, and below 500px it takes the full width. Above it the panel
sits in the flow beside the editor at a fixed 350px.
