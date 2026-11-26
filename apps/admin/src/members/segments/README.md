# Segments in Admin (prototype)

A prototype of how segments are shown and managed in Admin. It lives on the
`poc/segments-ui` branch and is not meant to merge. It exists to pick a
direction by looking at something that works.

Tracked in [DYA-306](https://linear.app/ghost/issue/DYA-306).

## Why this exists

Saved member views became segments with no visible change. Segments are about
to be used to email posts and start automations, so renaming, changing or
deleting one now has consequences a saved view never had.

On `main` a segment can only be renamed or deleted, from a small popover on the
members filter bar. Nothing on screen says who made it or what uses it.

The outcome we want is a clear long-term vision for segments in Admin, and the
smallest set of UI changes that meets the needs of the first release while
already pointing where we want to go.

## The idea

A segment is a filtered list of members. The members screen already is where
that list is viewed, filtered, saved and edited, so segments get no screen of
their own. **Members is the only entry point.**

Other screens, such as the publish flow or an automation's trigger, choose or
create a segment through shared components, without sending anyone to the
members screen.

## Primitives

The building blocks, and why each one exists.

| Primitive                                                                                                    | What it is                                                                                                                                                                    | Why                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Segment                                                                                                      | A name and a member filter, with an id.                                                                                                                                       | The record emails and automations point at.                                                                                                                                                  |
| Segment URL ([segment-route.ts](segment-route.ts))                                                           | `members?filter=…&segment=<id>`                                                                                                                                               | The id says which segment is showing. The screen still knows after its filters change, and two segments with the same filter are told apart. On `main` a view is matched by its filter text. |
| Segment list ([segment-list.tsx](segment-list.tsx))                                                          | Search, each segment with its member count and a tick on the one chosen, and a last "New segment" row.                                                                        | One list for every place a segment is chosen. The title dropdown and the picker each had their own and had already drifted.                                                                  |
| Title dropdown ([segment-switcher.tsx](segment-switcher.tsx))                                                | The members page title as a button that opens the list, with "All members" first. Hovering a segment shows a pencil that edits it in place, as the label picker edits labels. | Moving between segments never leaves the page, and a segment is renamed or deleted where it is listed.                                                                                       |
| Segment picker ([segment-picker.tsx](segment-picker.tsx))                                                    | A form field that opens the same list.                                                                                                                                        | For any screen that needs a segment chosen.                                                                                                                                                  |
| Segment builder ([segment-builder.tsx](segment-builder.tsx))                                                 | One form, shown as a dialog or as a popover: name, filters, and a live list of matching members.                                                                              | Creating a segment where there is no member list in view.                                                                                                                                    |
| Suggestions ([segment-suggestions.ts](segment-suggestions.ts), [suggestion-chips.tsx](suggestion-chips.tsx)) | A row of segments to start from, above an empty filter bar. Picking one fills in its filters, and the name.                                                                   | A blank filter is a hard start. Each place chooses which to offer.                                                                                                                           |
| Save popover ([save-segment-popover.tsx](save-segment-popover.tsx))                                          | Name, under the filter bar's button.                                                                                                                                          | Saving the filters already on screen. The member list behind it is the preview.                                                                                                              |
| Edit segment ([edit-segment-button.tsx](edit-segment-button.tsx))                                            | A secondary button in the members page header, before New member, while a segment is open. It opens the same form as the pencil in the title dropdown.                        | The pencil is only found by opening the list and hovering a row. This is the way that can be seen.                                                                                           |
| Segment menu ([segment-menu.tsx](segment-menu.tsx))                                                          | Rename, delete, on a row of Manage segments.                                                                                                                                  | The members page offers the same two from its title dropdown and its Edit segment button.                                                                                                    |
| Confirmations ([segment-dialogs.tsx](segment-dialogs.tsx))                                                   | A rename popover, and update and delete dialogs.                                                                                                                              | Where "this is serious" is said, and nowhere else.                                                                                                                                           |
| Manage segments ([manage-segments-dialog.tsx](manage-segments-dialog.tsx))                                   | A modal with a table of every segment, and New segment. Hidden for now: its icon in the members page header is gone, and the code stays.                                      | Looking over all of them at once. See [open questions](#open-questions).                                                                                                                     |
| Sidebar                                                                                                      | Every segment, as a shortcut under Members.                                                                                                                                   | Segments are made on purpose, so each one earns its place. Showing all of them keeps them few.                                                                                               |
| Usage                                                                                                        | Which scheduled posts and automations use a segment.                                                                                                                          | It is what makes changing or deleting one serious.                                                                                                                                           |
| Facts ([use-segment-facts.ts](use-segment-facts.ts))                                                         | Who created a segment and who last edited it, and when.                                                                                                                       | Read from History, where Ghost keeps authorship.                                                                                                                                             |

### How the list, the dropdown and the picker fit together

The segment list is the list itself. The title dropdown and the picker are two
buttons that each open it:

```text
Segment list        search, rows with counts, "New segment"
├── Title dropdown  the page title as a button, plus "All members" first
└── Segment picker  a form field
```

They are separate because the buttons differ. One is a page title that
navigates, the other a form field that sets a value. The list inside is one
component, so the two can't drift.

### Picker options

The picker takes what a place needs:

- `showCounts`: whether each segment shows its member count.
- `create`: how a new segment is made from it. `'popover'`, `'dialog'`, or
  `false` to leave the "New segment" row out.
- `suggestions`: segments the builder offers to start from. `useSegmentSuggestions`
  gives the defaults this site can use. Left out, none are offered.

## Core flows

### Create from the members screen

Filter the list, then **Save segment**. A popover asks for the name. With no
filter yet, or one without a value, the button takes you to what is missing
instead: the empty value, or the Filter menu.

Why: you see exactly who matches before you name it. The filters and the list
are the builder, so a second one on this screen would be a smaller copy of the
page.

"New segment", from the title dropdown, follows the same
idea. With filters that haven't been saved, it asks for their name. Otherwise
it starts a new segment on the page itself: the filter bar shows before there
is a filter, the suggestions sit above it, and **Save segment** is beside it
from the start. The list below is the preview. Picking a suggestion filters
the list and names the segment. Saving opens it. **Cancel**, or **Clear** once
there are filters, stops. With a filter that isn't finished, such as one with
no value yet, the cursor goes to what it is missing. Each time, "New segment"
takes the publisher to the next step there is.

Why: opening the filter picker alone looked like pressing Filter, so nothing
said a segment was being made. Opening the builder would cover the list with a
smaller copy of it.

### Create from another screen

Open the segment picker, choose **New segment**, and the builder opens as a
popover hanging from the picker, or as a dialog. The segment saved becomes the
one chosen.

Why: nobody is sent away from what they were doing. The builder lists the
members a filter matches as it is built, because the members screen isn't there
to show them.

The builder asks for the filters first, with any suggestions a place offers
above them. Once they match someone it widens, lists the members, and asks for
the name under them. A suggestion fills in the name too.

Why: it is the members page's order, filter, see who is in, then name it at
the save, so the builder works the same way. What to call a segment often
follows from who it turns out to hold. The **Filter first** prototype switch,
turned off, asks for the name first instead.

### Open and switch

- The title dropdown on the members screen, for any segment.
- Its shortcut under Members in the sidebar. Every segment has one. The sidebar
  shows the first five and folds the rest behind "Show N more".

With a segment open, the title shows its name, with who created it and who last
edited it underneath.

### Edit a segment's conditions

Change the filters while a segment is open. Nothing is saved by the change.
An unchanged segment has nothing beside its filters: to stop seeing them,
leave the segment. Once they change, **Reset** and **Save changes** appear
beside them. Save changes offers two things:

- **Update** the segment, after a confirmation showing the member count before
  and after, and naming what uses the segment.
- **Save as new segment**, which leaves the original alone.

Removing every filter doesn't leave the segment. It stays open, changed, with
the bar empty and its Filter button showing, as when a new segment is being
made, and Reset and Save changes stay beside it. Save changes takes you to the
Filter menu, since a segment can't be saved with no conditions. You leave only
on purpose: with Reset, or by opening something else. "Show all members", on
an empty list, also leaves it.

Why: whatever uses a segment follows it, so changing who is in it should never
happen by accident. And replacing a segment's only condition used to mean
adding the new one before removing the old, because removing it first threw
you out to All members.

### Rename, delete

Two ways in, one form:

- **The title dropdown.** Hovering a segment shows a pencil where its tick
  sits, as the label picker edits labels. Any segment can be edited from it,
  not only the one open: deleting another leaves you where you are, and
  deleting the open one takes you to All members.
- **Edit segment**, the secondary button before New member while a segment is
  open, opens the same form for that segment.

The form is the label picker's edit row: the name, **Delete** on the left,
**Cancel** and **Save** on the right. Enter saves, Escape cancels.

- Rename has no confirmation: everything refers to a segment by id. From
  Manage segments it opens as a popover beside the row.
- Delete asks first, in a dialog rather than in the row as a label's does,
  because a segment can be in use. The dialog says the two things that
  matter: "Deleting this segment removes it for all staff. Your members won't
  be changed or removed." When something uses the segment, it is blocked, and
  the dialog names what to change first.

### Use a segment

Both are mocks, to see how it looks:

- **Publish flow.** Segments are listed under "Specific people", between tiers
  and labels. The count says how many would get it ("13 specific
  subscribers"), as the server counts a segment named in a members filter
  (`segment:'<id>'`, with the `segmentEmails` flag on). A post's email
  recipients can't name a segment yet, so it still can't be sent to one.
- **Automations.** "Member entered segment" is a trigger in the chooser for a new
  automation. Its card asks for the segment with the picker, and a new one can
  be made in place.

## Decisions and why

- **Members is the only entry point.** We tried a Segments item in the sidebar
  with its own page, then segments under it. A segments page kept
  shrinking to a list of links back to the members screen.
- **One concept, not views and segments.** Every saved view is a segment, and
  shows in the sidebar as saved views do on main.
- **Seriousness follows consequence.** Nothing for a rename, clarity for a save,
  a real confirmation for a change of conditions or a delete.
- **The filter bar is for conditions; the segment is acted on elsewhere.**
  Beside a segment's filters there is nothing until they change, then
  **Reset** and **Save changes**. There is no Clear on an unchanged segment:
  its filters are the segment, and leaving it is how to stop seeing them.
  Clear stays for filters that aren't a segment's. Rename and delete moved
  off the bar ("Edit segment" sat there on main as "Edit view"), because they
  act on the segment, not on what it filters. Tried and dropped on the way: a
  ••• by the title, which competed with the header's own ••• (and that menu
  deletes members, so "Delete segment" there sits beside "Delete members");
  rows for Rename and Delete under "New segment" in the title dropdown, which
  cluttered the list; a pencil on sidebar rows, which was noise on something
  passed through constantly; and "Edit" at the end of the line under the
  title, which made a line of facts look clickable.
- **Delete copy says who loses it, and that members are safe.** Staff is
  Ghost's word for the people who use Admin, as in Settings → Staff; "users"
  would mean staff or members. "Can't be restored" was dropped: the dialog
  is there to show a delete is harmless to members, and the button already
  says Delete segment.
- **Usage is only mentioned when it matters.** Nothing says "not used". What
  uses a segment is shown when it is about to be changed or deleted.
- **Copy names the value, not the features.** The empty state reads "Save a
  filter as a segment to keep an eye on the members who matter most to you."
  The first half says what a segment is, which is what its button opens. What a
  segment is used for, emails and automations, comes in later releases, so the
  copy doesn't promise it.
- **Suggestions, not templates.** The builder can offer a few segments to start
  from, on one row above the filter bar while it is empty, scrolling sideways
  with faded edges (`suggestions`, off unless a place passes them). Picking
  one fills in its filters, and the name if none is typed. A name a suggestion
  filled in is the suggestion's until it is edited: another suggestion
  replaces it, and clearing the filters clears it. Nothing is saved for the
  publisher. Templates in front of every new segment would be a step more
  for anyone who knows what they want. Only suggestions the site can use
  are offered: open rates need open tracking, paid members need Stripe.
- **Each place chooses its suggestions.** A place passes the defaults
  (`useSegmentSuggestions`), its own, or both. Whatever it passes, the builder
  leaves out any the site already has: one whose filter a segment has would be
  a copy, and one whose name a segment has couldn't be saved.
- **Every segment is in the sidebar, with no pinning.** Segments should be
  made on purpose. A segment that shows to the whole team is one someone
  thought about, and the list stays short. It is what main does with saved
  views, so nothing changes on upgrade. Pinning was tried, from the segment
  menu and the save form, and it made every save ask a question few needed
  answered. Unpinning on hover in the sidebar, as apps do, made rows vanish
  under the pointer.
- **The order is the site's, set by dragging in the sidebar.** Every list of
  segments reads it: the sidebar, the title dropdown, the picker and Manage
  segments. It is part of how a team organises its segments, so it is shared,
  as the order of newsletters and custom fields is. Staff who can change
  segments drag a row onto another to take its place. While the list is
  folded, only the rows in view can be dragged. A new segment goes last.
  Pinning on hover, to move a segment up, was the cheaper alternative, but in
  Apps a pin means "in the sidebar at all", and drag covers what it was for.
- **The sidebar folds a long list.** It shows five, then "Show N more", which
  opens the rest in place and becomes "Show less". The segment on screen
  always shows. Under the Admin 7 design the list opens whenever Members does
  and can't be closed, so without the fold a site with many segments loses
  the rest of its sidebar.
- **Save buttons stay enabled.** Saving says what is missing and the button
  offers to retry, as Ghost's other forms do.
- **Built from Shade.** The forms use Shade's field components and the lists its
  list rows. The exception is the title's button, which has to take the page
  title's own type in both designs.
- **Counts sit beside names**, in the quieter grey, the way the page title shows
  its own count.

## Open questions

To explore, and to take to design.

- **Do we keep the Manage segments modal?** Hidden for now, to see the screen
  without it. With every segment in the sidebar, the sidebar and the title
  dropdown are the overview, and each segment is managed by opening it. The
  modal would add tidying up several at once. Reverting one commit brings its
  icon back.
- **Where does Manage segments live?** An icon of its own in the members page
  header, before the ⋯ menu, as Shade's page header orders icon-only actions.
  Before that it led the ⋯ menu, whose other items act on the members listed:
  reverting one commit puts it back there. Tried and dropped: a row at the
  bottom of the title dropdown, and an icon beside "Search segments..." in it
  (sliders, a gear, a faintly filled gear). Other homes considered: the
  sidebar, a Segments card in Settings → Membership as custom fields have, or
  no overview at all.
- **Is Edit segment in the header too loud for a rare action?** It is a
  labelled secondary beside New member, with the segment's pie icon. On a
  phone the label is hidden and the pie alone doesn't say "edit"; the tooltip
  does.
- **With no segments yet**, should the title still be a dropdown offering only
  "New segment", or only become one once a segment exists?
- **Fold or limit?** The sidebar folds after five segments. The alternative is
  a "more" row that opens the list in a popover, so the sidebar never grows. Is
  five the right number? Posts' saved
  views have the same problem and aren't touched here.
- **"New segment" on the members screen.** It now starts a new-segment state
  on the page itself (see [Create from the members screen](#create-from-the-members-screen)).
  The alternatives were the filter control alone, which said nothing about a
  segment, and the builder, which would cover the list with a smaller copy of
  it. Is the state clear enough, and should the title say so while it lasts?
- **Is editing a segment's conditions in the first release?** It needs an API
  change.
- **The builder's order: name first, or filters first?** Leaning filters
  first, now the default. Three ways were considered:
  - **Filters first, the name once they match someone** (the default).
    Suggestions and filters, then the members they match, then the name under
    them, as on the members page.
  - **Name first.** The name is asked for, and focused, before anything is
    chosen, though what to call a segment often follows from who it turns out
    to hold. Try it by turning the **Filter first** prototype switch off. It
    changes every builder: the dialog, the popover and the automation
    trigger's.
  - **Two steps, with Next,** as adding a recommendation is: filters and
    members first, then Next for the name. Clearest about the
    order, but a step more for a small form, and the popover would change
    size between the steps. Not prototyped.
- **Suggestions.** Which, how many, and where else: the Manage segments empty
  state, or the title dropdown before there are segments?
- **Where else usage shows.** A tooltip or a link, beyond the confirmations.
- **Emailing a segment regardless of newsletter subscription.** Today a post
  reaches only the segment's members who subscribe to the newsletter. This is a
  product question on the ticket for emailing a post to a segment.

## Real and faked

| Real                                           | Faked                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Editing a segment's conditions                 | "In use", from a switch in the prototype controls                                               |
| The site's order of segments, `PUT /segments/` |                                                                                                 |
| Created and last edited, from History          | Whether the sidebar shows every segment, kept in the browser's local storage                    |
| Member counts                                  | Segments in the publish flow: listed and counted, but the post can't be sent                    |
|                                                | The automation trigger: saved as a free signup automation, with the segment kept in the browser |

Nothing here needs a migration.

## Notes for Shade

Found while building this, for design:

- **A row's highlight reaches 16px past it on each side**, even with hover
  off. A list or table in a scrolling box needs a 16px gutter, or the box
  scrolls sideways. The Manage segments table and the builder's member list
  both hit it.
- **The inset row variant doesn't pull in a clickable row's click area.** Its
  rule is less specific than the one it overrides.
- **In dark mode, outline buttons all but disappear on a dialog.** Their border
  is a dark grey at 70% opacity on the lighter dialog surface. Cancel looks
  like this in every dark dialog.
- **In dark mode, the filter bar has no shape inside a Dialog.** Its background
  is the Dialog's surface colour. `SettingsModal` uses the page background, so
  the bar would show there. Moving the builder to `SettingsModal size="sm"`
  would also match the custom field dialog's width, padding and title.

## What a real version needs

- **Segments API.** Accept a change of filter. Return created and last edited,
  and member counts, with each segment. The prototype makes one count request
  per segment and reads History in the browser.
- **Reordering.** `PUT /segments/` takes every segment's id in the order
  wanted and refuses an order that leaves one out. It needs a keyboard way to
  move a row: Enter and Space on a sidebar row open the segment, so the
  prototype has none.
- **Sidebar fold.** Whether the sidebar shows every segment belongs with the
  staff user's other navigation preferences.
- **Comparing filters.** A segment shows as changed when the filter in the URL
  isn't its own, compared as text. A filter saved by another client with its
  conditions in another order opens as changed. They should be compared by
  meaning.
- **Filters Admin can't show.** The members screen drops any condition its
  filter controls can't express, such as an open rate "at least" 50, and
  rewrites the URL without it. A segment saved with one opens as changed and
  lists the wrong members. A segment made through the API, or by another
  feature, can hold such a filter, so the segments API should refuse one, or
  Admin should show it read-only.
- **Usage.** A lookup of the scheduled posts and automations that use a segment.
- **Filter control.** A way to open it from outside. The prototype sends it its
  own keyboard shortcut.
- **Members filter bar.** Its actions now sit beside the filters instead of over
  a fixed strip. That fix belongs in the shared component.
- **Tests.** The saved views tests aren't updated, and two segment API tests
  fail on purpose because a filter can now change.

## Trying it

```bash
pnpm dev:up dev:fake-mailgun
```

Open Members. At the bottom of the screen are the prototype controls:

- **No segments** shows the site as if it had none.
- **Clear** deletes every segment, for real, and resets the prototype's own
  state: the sidebar fold, pretend usage, the automation mock. **Seed** puts
  back the segments the prototype is shown with. Seeded
  segments are created now, by whoever seeds them.
- **In use**, while a segment is open, pretends a scheduled post and an
  automation use it, so the dialogs that say so can be seen.
- **Filter first**, on by default, has the segment builder ask for its filters
  first and the name once they match someone. Off, it asks for the name first.
- **Builder dialog** and **Builder popover** open the segment builder.

"Pretend it is in use", in a Manage segments row's menu, does the same as In
use.

## Snapshots

Three directions are tagged, each one checkout away:

- `poc-segments/a-segments-sidebar-item`: a Segments item in the sidebar with
  its own page, pinned segments under Members.
- `poc-segments/b-pinned-under-segments`: pinned segments under Segments.
- `poc-segments/c-members-only`: Members as the only entry point. The current
  one.
