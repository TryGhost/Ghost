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
publish time belong to the save engine's command target, which the publish flow
owns; a publish-date section reads and writes them through that command, not
through a field patch. The slug belongs to the slug machine, which authors it on
every save; the URL section routes a manual edit through the machine's
`slugEdited`, so a slug written as a field patch would be dropped before the
request is built.

## Sections

`SETTINGS_SECTION_ORDER` in `sections.ts` is the full running
order, including sections that have not been built yet. An id with no entry in
the component's `sections` map renders nothing, so adding a section is a matter
of filling its slot rather than deciding where it goes.

Role gates live with the section, not with the frame: every role that can open
the editor can open the sidebar, and a section the writer's role cannot write is
the part that is left out.

The excerpt is the one field with two homes. When the inline excerpt is on it
renders under the title and the sidebar leaves it out; when it is off the
sidebar owns it. Either way the same session binding is behind it.

## Access

Access is two coupled fields, `visibility` and `tiers`, and only an Owner,
Administrator or Editor sees them. A post carries no visibility until its first
save applies the site default, so the select shows `default_content_visibility`
until then; choosing that same value explicitly is still an edit and still
saves. Choosing anything other than `Specific tier(s)` clears the tiers it
granted. The tier list is every one of the site's paid tiers, active ones
before archived, and it loads only while `Specific tier(s)` is the choice.
The free tier returned with Public and Members posts is excluded from the
selection; a tier ID without type metadata is preserved.

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
visibility and the tier list, including unchanged tier IDs. The API also returns
tier relations for Public and Paid posts, so changing visibility alone can leave
those IDs unchanged. Once saved, an unrelated edit sends neither access field.

Koenig cards read the post's access from the editor's card config, which follows
the live field rather than the saved record: a staged visibility changes what
the cards describe before any save.

## Open and closed

The toggle sits in the editor header, and the panel starts closed on every
editor entry. There is no keyboard shortcut for it.

Below the `lg` breakpoint the panel overlays the editor from the right rather
than narrowing it, and below 500px it takes the full width. Above it the panel
sits in the flow beside the editor at a fixed 350px.
