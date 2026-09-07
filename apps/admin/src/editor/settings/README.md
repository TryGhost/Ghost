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
carried in the session's projection but never sent: a field enters the save
payload once this session has edited it, so a value the session merely opened
with can never overwrite a change made elsewhere.

Two fields are deliberately absent from the settings projection. Status and
publish time belong to the save engine's command target, which the publish flow
owns; a publish-date section reads and writes them through that command, not
through a field patch.

## Sections

`SETTINGS_SECTION_ORDER` in `sections.ts` is the full running
order, including sections that have not been built yet. An id with no entry in
the component's `sections` map renders nothing, so adding a section is a matter
of filling its slot rather than deciding where it goes.

Role gates live with the section, not with the frame: every role that can open
the editor can open the sidebar, and a section the writer's role cannot write is
the part that is left out.

## Open and closed

The toggle sits in the editor header. Its state is remembered per browser, so
the next post opens the way the writer left the last one. A browser that refuses
storage costs the preference and nothing else.
