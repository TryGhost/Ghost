# Post settings sidebar

`apps/admin/src/editor/settings/` holds the settings panel beside the post
editor: the frame, its header toggle, and the sections that edit a post's
non-body fields. No section here saves the post: every field goes through the
editing session, which is the only writer. A section is handed a narrow port
onto that session — the settings fields, their writers, and the few other
members the sections read — rather than the whole editing handle.

## Save policy

A settings field is staged as the writer changes it and committed on the gesture
that ends the edit — a blur for a text field, the choice itself for a toggle or
a picker. Committing is not saving: whether the value is persisted now or held
until the writer asks for a save is the session's one save policy gate, and
[the session README](../session/README.md#staging-and-committing) describes it
and the rules that hold a commit back.

Two of the panel's sections write something that is not a settings field, so
they have their own routes onto the session: the URL section edits the slug
through the slug machine, and the Publish date section stages the publish time,
which is the save engine's command target. Both are then subject to the same
gate as everything else.

The meta and social-card text fields are held to the widths their columns give
them, 300 characters for a title and 500 for a description. Past one of those
the field says so where the writer is typing and nothing is saved — not the
field itself, and not a save the writer asks for, which is refused with the same
message rather than sent and answered with a server error.

## Sections

`SETTINGS_SECTION_ORDER` in `sections.ts` is the full running order, and the
sidebar frame renders one entry per id in that order. The frame's own `sections`
map is where a section is built and where its role gate lives: every role that
can open the editor can open the sidebar, and a section the writer's role cannot
write is the entry the map leaves out. The prose below follows that order.

## Subviews

Some sections are a row that opens a pane over the rest of the panel rather than
fields in the list. `SettingsSubview` in `settings-subview.tsx` is both halves:
give it the section's own id, an icon and a label for the row, a title and a
back-button label for the pane, and the pane's fields as children. Two props
adjust the shell around them: `wide` widens the panel for a pane that needs the
room, and `contentClassName` overrides the pane body's default padding for a pane
that runs full-bleed. Without either, the shell renders the pane as it renders
this one.

Only one pane is open at a time. While it is, the panel shows that section
alone: its heading, the other sections and their rows are all out of the way,
and the back button or Escape brings them back. The pane's title is the panel's
heading and its accessible name, and the pane's header stays in place while the
fields under it scroll. Opening a pane moves focus to its back button, and
closing one returns focus to the row it was opened from. Closing also blurs the
focused field before removing it, so Escape commits the edit as the back button
does.

An Escape something inside the pane has already answered — a dialog, a select,
an uploader, the Unsplash search — leaves the pane open, so the writer dismisses
one layer at a time.
A pane whose section renders nothing, as a role-gated section does for a role
that cannot write it, falls back to the section list rather than an empty panel.
The panel owns which pane is open, so closing the panel or leaving the editor
drops it and the panel is next opened on the section list.

Returning to the section list and reopening the same social-card pane keeps an
in-progress image upload pending. Its file picker and Unsplash button stay
disabled until the upload succeeds or fails.

## Escape

Escape closes one layer, the innermost the writer is in. In a tag or author list
it closes the list and keeps the term that was typed. In a code injection editor
it frees the editor's Tab and closes nothing. In a dialog, a select or an
uploader it closes that control. In the Unsplash search it closes the search and
leaves the field it was opened from. With none of those open it closes the pane,
and with no pane open the sidebar answers Escape with nothing.

The Unsplash search traps focus and loops Tab navigation in both directions.
Closing it returns focus to the picker button when that field is still present.

## Open and closed

The toggle sits in the editor header, and the panel starts closed on every
editor entry. There is no keyboard shortcut for it.

Below the `lg` breakpoint the panel overlays the editor from the right rather
than narrowing it, and below 500px it takes the full width. Above it the panel
sits in the flow beside the editor at a fixed 350px, widening to 500px for a
pane that asks for the room.

## URL

The URL section edits the slug. A manual edit goes to the slug machine, whose
[ownership and ordering rules](../engine/README.md#slug-machine) decide what
happens to it, and only a proposal the machine applies reaches the live
document, where the save policy then decides whether it is persisted or staged.
A superseded proposal is ignored, and a generator that fails or answers blank
leaves the slug alone: the input reverts to whatever the machine still holds and
the section says the URL could not be updated, marking the input itself invalid,
so a lost edit is never silent. The input is disabled while a proposal is in
flight.

A manual proposal counts as unsaved work until it settles, so Update or Cmd-S
cannot save the old URL while the generator is still answering and the
navigation and tab-close guards ask about it; the session owns
[that wait](../session/README.md#the-slug).

The preview under the input is the site URL without its scheme, then the slug,
both slash-terminated. The section is the slug and that preview and nothing
else: it does not link out to a published post, and a sent post previews its
site URL like any other rather than the separate email URL it also has.

## Publish date

When the post is published, edited in the site's timezone and carried as a UTC
instant. A post that has no publish time yet shows the current moment, and only
an edit stages a value, so an untouched draft still leaves the time to the
server. The date is chosen from a calendar and the time typed as `HH:mm`; an
unparseable time returns to the value already held. Both fields commit at minute
granularity, and the seconds a publish stamped are kept whenever the committed
minute is the one already saved. Tabbing through an untouched time, retyping it,
or choosing the displayed calendar day does not commit a value.

An edit made during a save stays staged until that save settles, even if the
writer returns to the saved minute or a refetch already carries the chosen time.
An older response cannot discard that choice. Once the saved time agrees and no
older save can overwrite it, the staged edit is released.

The calendar stops at today, and a draft's or published post's time may not be
the current moment or later. Choosing one leaves the value staged and shown with
`Please choose a past date and time.` beside the fields. A sent post is exempt
from the rule and is re-timed like a published one.

A status command cannot carry a time the section refuses either. Publishing and
unpublishing take the staged time when they have none of their own, so both are
refused with the same message while it is still to come; a staged time already in
the past is carried, and the post is backdated to it. Scheduling carries the
publish flow's own time and releases whatever the sidebar staged. The flow's
picker is not pre-filled from a staged time: its floor is ahead of now and a
staged time is always in the past, so there would be nothing left to keep.

A scheduled post's fields are disabled and carry `Use the publish menu to
re-schedule`: its time is the publish flow's to move, and the section says so
rather than offering a second route to it. Once a scheduled time has passed the
section reads `Publish date` again and drops the note, though the fields stay
disabled until the server moves the post to published.

Every role that can open the sidebar can set the publish date. It is not one of
the Owner, Administrator and Editor fields.

## Tags

Tags are a relation rather than a value, and the section writes them as one:
the field holds the post's tags in order, because that order is the
`sort_order` Ghost stores and the first public tag is the post's primary tag.
Contributors do not get the section.

Each tag reaches the save as its identity and nothing else — the id of one the
site already has, or the bare name of one the writer typed. The server keeps a
tag relation's name and slug and writes them onto the tag row, so sending back
the record the post was read with reverts a rename made since; the record stays
in the field, where the chips are drawn from, and never enters the payload. A
typed name is created by the post's own save, so an abandoned edit leaves
nothing behind, and a leading `#` reads as an internal tag in the field before
the save because that is the rule the server applies. Two tags can share a name
and differ only by slug, so what makes them the same tag is the id whenever both
sides have one.

The list offers the first hundred tags matching what is typed, in name order.
Narrowing the search is how the rest are reached. Enter takes the highlighted
row, and so does Tab once something is typed; Tab through an empty field moves
on. Escape closes the list and leaves the term where it was typed. A chip is
removed by clicking it, or with Backspace on an empty field.

## Access

Access is two coupled fields, `visibility` and `tiers`, and only an Owner,
Administrator or Editor sees them. A post carries no visibility until its first
save applies the site default, so the select shows `default_content_visibility`
until then. Re-choosing the value already shown is not an edit and sends
nothing. Choosing anything other than `Specific tier(s)` clears the tiers it
granted. The tier list is every one of the site's paid
tiers, active ones before archived, and it loads only while `Specific tier(s)`
is the choice. The browse is followed page by page, and the list shows once the
last page has arrived. Reads carry tier relations for Public, Members and Paid posts;
the free tier that comes with Public and Members reads is excluded from the
selection, and a tier ID without type metadata is preserved. A failed tier
lookup shows an error and a Retry action in place of the list.

An empty tier selection is staged like any other edit but never sent: the
section asks for at least one tier, and while the pairing is incomplete no field
save runs and a save the writer asks for is refused with the same message.
Because the pairing is staged rather than held in the panel, it survives closing
the sidebar, enables Update and is what the leave guard asks about. A create
with untouched access settings still uses the server default; an explicit tier
selection must include a tier even on the first save.

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

## Excerpt

The excerpt is the one field with two homes. When the inline excerpt is on it
renders under the title and the sidebar leaves it out; when it is off the
sidebar owns it. Either way the same session binding is behind it.

## Authors

Authors is a token field: a chip per credited staff member and a list of
everyone else, and everyone except an Author or Contributor sees it, in the
page editor as well as the post editor. Users are never created here, so the list only
offers people the site already has. It is read once, when the list is first
opened, rather than on every editor entry, and the chips are named from the
post's own relations until then — including the chips an edit leaves behind, so
removing one never leaves the rest reading as bare ids. The read continues until
every page of staff has arrived, and the list reads as loading until it has, so
a site with more staff than one page holds still offers all of them.

A failed staff lookup shows an error and a Retry action in the list. Retrying
keeps the selected authors and returns focus to the search field.

The list narrows as the writer types, matching a name, slug or email and
ignoring case and accents, and it leaves out anyone already credited. Arrow keys
move the highlight, Enter takes the highlighted row and so does Tab once
something has been typed, Escape closes the list and keeps the term, and both
clicking away and moving focus out of the field close it and discard the term. A
chip is removed by clicking it, and Backspace in an empty field drops the
last one and opens the list on the staff it can offer again. A pick that empties
the row under the highlight moves it to the last row rather than losing it.

Order is meaningful and the field keeps it: a new author joins the end of the
list, and the post is written with its authors' identities alone, in that order.
The whole staff record stays in the field and the request is what reduces it.
A post always needs one. A new post is credited to whoever started it, which is
what the first save sends; emptying the list instead leaves the field asking for
an author, and while it is empty no field save runs and a save the writer asks
for is refused with the same message, which the publish flow carries too. The
field itself is marked invalid and points at that message.

## Template

The theme decides which templates a post may render with, so the section is the
active theme's list and nothing else: its slugless templates, by name, under a
Default that stands for the post carrying no template. A template the theme no
longer offers reads as the default. A theme with no such templates leaves the
section out entirely, and every role that can open the sidebar sees it. A failed
theme lookup is not the same as an empty one: the section stays and shows an
error and a Retry action.

A theme may also bind a template to one post URL. Where the post's slug matches
one, the theme applies that template whatever the field holds, so the select is
disabled and names the template the URL picked.

## Show title and feature image

A page can render without its own title and feature image, and only a page: the
field has no meaning for a post, so the section is left out there. Every role
that can open the editor sees it, and the editor's cards read the live value
rather than the saved one.

Honouring the choice is the theme's job. When the active theme's report says its
page-builder helper is missing and the writer has turned the setting off, the
section says so and links to the theme documentation. The signal comes from the
theme report's errors and warnings alike; a backend that reports nothing is
taken to support the helper, so no warning is shown. The report is only read
once the choice is off, and never for a Contributor, who cannot read it.

## Featured

A single switch, worded for a post or a page, that marks the post as featured.
Only an Owner, Administrator or Editor sees it.

## Post history

The row opens the post's saved versions, and it is absent whenever there is
nothing to show: a post that has never been saved, one with no lexical content,
and a published or sent post that only ever went out as an email.

Versions are listed newest first, each with its date in the site's timezone and
the author who wrote it, shown with their avatar; an author the API no longer
resolves reads as a deleted staff user. The newest carries a `Latest` label, the version that first took the
post to published carries `Published`, and one written because the post was
unpublished carries `Unpublished`. Selecting a version previews it — feature
image, title, the excerpt where the inline excerpt is on, and a read-only
rendering of its body — and changes nothing about the post. The feature image
caption is stored HTML, rendered as such and limited to the marks a caption can
carry.

Every version but the newest can be restored if it carries body content, behind
a confirmation that says the site will be updated when the post is already
published. The restore itself — what it writes, what it saves, what happens to
the slug and what a refusal puts back — belongs to
[the session](../session/README.md#restoring-a-revision); the editor adopts the
restored content and closes the history only once that save lands.

While a restore is saving, the confirmation and history cannot be dismissed.
An expired session asks the writer to sign in in a new tab before trying again.
Closing history returns focus to its sidebar row. Older versions without body
content remain available to preview but cannot be restored, so missing data
cannot erase the current body. Malformed revision lists are treated as
unavailable by both the editor and history; an invalid site timezone falls back
to UTC.

## Code injection

The row opens a pane holding the header and footer code this post injects into
the page it renders on, each an HTML editor labelled with the theme helper it
lands in. Every role that can open the panel can write both fields. A page's
editors are named for a page rather than a post.

Closing the pane commits the editor the writer was in, and a field cleared back
to empty is stored as no value, as the excerpt is. A post saved before that
convention holds an empty string rather than no value, so clearing such a field
back to empty counts as a change until the next save.

Escape inside either editor leaves the pane open. An open completion list or a
selection wider than the cursor takes it first; otherwise it frees the editor's
Tab, so the next Tab moves on to the footer editor and out of the pane rather
than indenting. The back button, or Escape from anywhere else in the pane,
still closes the pane.

## Meta data

Meta data is a pane, and every role that can open the panel can open it. A meta
field cleared back to empty is stored as no value, as the excerpt is.

Neither field is required, and the character counts beside them are a
recommendation rather than a limit: 60 for the title, 145 for the description,
counted as symbols so a multibyte character counts once, and coloured once the
writer is past the recommendation.

The preview under them is the result the post would produce. Each line falls
back rather than emptying: the title is the meta title, else the title the
writer is looking at, else `(Untitled)`; the description is the meta
description, else the post's excerpt, else a sentence explaining that search
engines will compose their own. The address is the canonical URL when the post
carries one, else the site's own host and path with the post's slug. Titles and
descriptions are truncated to what a result shows, counting whole Unicode
characters and the ellipsis toward the limit.

## X and Facebook cards

The card each network renders for the post is a pane of its own, and every role
that can open the panel can open either. Their image, title and description are
the post's `twitter_` and `og_` fields: the title and description are staged as
the writer types and committed on the blur that ends the edit, and an uploaded
or removed image is committed as it lands rather than waiting for a blur. A
field cleared back to empty is stored as no value.

The image comes from the file picker, a drop, or Unsplash, and an upload the
server refuses is reported without changing the field. The Unsplash picker is
offered only while the site's Unsplash integration is on, and it writes the
image it is given the same way an upload does.

Nothing here is required, and both cards fall back the same way rather than
emptying. The title is the card's own title, else the meta title, else the title
the writer is looking at, else `(Untitled)`. The description is the card's own
description, else the post's excerpt, else its meta description, else the
excerpt the server generated for it, else the site's own description. The image
is the card's own image, else the post's feature image, else the site's image
for that network, else the site's cover image.

Those fallbacks are what the two inputs show as placeholders, truncated to 40
and 150 characters, and what the card under them previews, against the site's
address without its scheme. The two previews differ only in shape: X stacks the
title, the description and the domain and shows the title whole, while Facebook
stacks the domain, the title and the description and truncates both to the 140
characters the description is held to.

## Keyboard shortcuts

A pane every role that can open the panel can open, and the one thing in the
sidebar that edits nothing: the chords and slash commands the editor answers to,
grouped as Formatting, Editing, Application and Inserting, with the keys shown
against each. The modifiers are drawn as the writer's own platform draws them —
the Mac glyphs for a Mac writer, the key names for everyone else — read from the
user agent as the pane renders. Hovering a glyph names the key it stands for;
a key already shown as its name carries no tooltip. A slash command reads the
same wherever it is typed.

## Delete

Deleting is the one thing in the panel that does not go through the session: it
calls the API itself. A post has nothing to delete until its first save gives it
an ID, so the button appears only once the post exists, and every role that can
open the editor is offered it — which posts each of them may actually delete is
the API's answer, not the panel's.

Confirming names the post and says the deletion is permanent. Cancelling returns
focus to the Delete button. An expired session asks the writer to sign in in a
new tab before retrying, so their draft stays open. A refusal keeps
the dialog, shows the sentence the API gave for it and leaves the editor as it
was, so unsaved work is still the writer's to save. A deletion that succeeds
ends the editing session before leaving for the list: the save in flight is
abandoned and every later one is dropped, including the save the leave guard
would otherwise make on the way out, so nothing is written after the delete
lands. The writer is not asked about unsaved changes, and the list replaces the
editor in history rather than stacking on top of it.

The list the delete lands on is refetched rather than served from the cache it
was left with, which would still carry the deleted row. The refetch is left to
the list's own mount: the editor's read of the post it just deleted is still
mounted at that moment, and refetching that would answer 404.
