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
acknowledgement: the next save persists the undo.

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

## Open and closed

The toggle sits in the editor header, and the panel starts closed on every
editor entry. There is no keyboard shortcut for it.

Below the `lg` breakpoint the panel overlays the editor from the right rather
than narrowing it, and below 500px it takes the full width. Above it the panel
sits in the flow beside the editor at a fixed 350px.
