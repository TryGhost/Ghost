# Post editor

`apps/admin/src/editor/` is the React post and page editor: the screen, the
Koenig surface it wraps, the settings sidebar beside it, and the publish and
preview flows it opens, plus the restore screen that turns a local copy of a
lost draft back into a post. `api.ts` is the domain's public surface — the shell
mounts both screens lazily through it and everything else here is internal.

While React serves the editor, the shell also fetches the editor screen and
Koenig through `api.ts` once a signed-in admin is idle, so opening the first
post doesn't wait on either download.

The editor opens once it has the site's settings, config and site record and
the current user, which Koenig's cards are configured from. If one of them fails
to load with no copy cached, the editor shows its load error, and Retry reads it
again.

## The modules

| Module                                           | What it is                                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [`engine/`](engine/README.md)                    | The pure, React-free save engine, change tracker and slug machine. No React, no network, every effect through a port |
| [`session/`](session/README.md)                  | The editing session that composes those three and is the editor's only writer                                        |
| [`settings/`](settings/README.md)                | The settings panel beside the editor and the sections that edit a post's non-body fields                             |
| [`publish/`](publish/README.md)                  | The publish options machine and the publish, update and email-failure flow                                           |
| [`preview/`](preview/README.md)                  | The modal that shows a post as the site renders it or as the newsletter it would be sent as                          |
| `editor-screen.tsx`                              | The route: loads the post, builds the session, and lays out the header, the surface and the sidebar                  |
| `post-editor.tsx`, `koenig-post-editor.tsx`      | The title, excerpt and feature image around the Koenig instances, and the Koenig integration itself                  |
| `editor-header-actions.tsx`, `editor-status.tsx` | The header's publish and preview controls, and the line saying where the post stands, with a failed send's retry     |
| `use-save-feedback.tsx`, `save-toast.ts`         | The toast and button progress that report an explicit save, and the pure copy they show                              |
| `card-config.ts`, `use-post-card-config.ts`      | What Koenig's cards are told about the site and the post they are being edited in                                    |
| `local-revisions.ts`                             | Browser-local copies of drafts holding unsaved work: how they are stored, trimmed and read back                      |
| `email-size.ts`, `use-email-size.ts`             | The estimate of how large a post's newsletter would be, and when the editor makes it                                 |
| `restore/`                                       | The `/restore` screen: lists this browser's local copies and creates a new draft from any of them                    |

Two small modules are shared across all of the above. `request-options.ts`
carries the editor's opt-out from the transport's session-expiry redirect, which
every request the editor makes passes: leaving the page would take unsaved
content with it, so the editor surfaces an expired session itself. Until a post
has opened nothing is unsaved, so a first read refused because the session has
expired reloads the page instead: the signed-out admin asks the writer to sign
in and then reopens the post. The opt-out belongs to whichever component starts
a fetch rather than to the cache entry, so a component reading a query key it
shares with a screen outside the editor opts out too. `layering.ts` carries the z-index a confirmation dialog opened from
inside another editor surface needs in order to paint above it.

## Title and excerpt limits

The title is held to 255 characters, counted as the server counts a title:
trimmed, with an emoji and its presentation selector as one character. Past
that the title says so beneath itself and nothing is saved, and a save the
writer asks for is refused with the same message. The inline excerpt is held to
300 characters, counted by code point, and its divider turns red while it is
past them.

## Opening the publish flow

A draft opens the publish flow from three places: the header's Publish button,
its keyboard shortcut and the preview's Publish. A published or sent post whose
newsletter failed opens it from the status line instead, which offers "Retry
now" on an email-only send and "View details" on a published post; the flow
then starts at its email-failure step. Whether a post qualifies is decided by
the flow's own `initialEmailError()`, and the button is offered only to roles
Core lets retry an email, so an Author sees the failure without it.

Every opener stays unavailable until the publish inputs have loaded, and so
does the update flow behind Unpublish and Unschedule. When they fail to load,
the header shows the error with a Retry beside Publish, Unpublish or Unschedule,
and for a post whose status line offers the retry. After a retry, or a publish that
emails, a published post's status line reads "Published and sending to N
members" while the email is on its way and "Published and sent to N members"
once the flow's email confirmation finds it submitted; an email-only send reads
"Sent to N members" throughout. With the `improveSendingUI` flag on, a publish
does not wait for that confirmation, so the status line shows the send as the
save left it.

After successful completion, the editor follows the publish flow's celebration
handoff to the destination screen. Pages return to `/pages`; scheduled posts
and posts without email return to `/posts`. Immediately published posts with
email, including email-only sends and posts that were emailed previously, open
`/posts/analytics/:id`. Failed saves and failed sends keep the flow open so the
writer can retry. With the flag on, a publish that emails opens analytics as
soon as it saves, and a send that fails after that is reported there rather
than in the flow; retrying a failed send from the status line still waits for
the email.

## Leaving the editor

The header's back link returns a post to the posts list and a page to the pages
list, with the filters and sort order the list was left with. A post opened
from its analytics screen or from the analytics overview instead reads
"Analytics" and returns to the screen it was opened from, path and query string
included. Those screens pass `editorReturnState()` from `api.ts` as router
state, and the editor accepts only a path under `/posts/analytics/` or
`/analytics`. The return survives a reload, since it lives in the history
entry, but a new post never gets it. While the link leads to analytics, the
status line is hidden unless the post's newsletter failed to send or a save
failed.

## Images

The feature image and the X and Facebook card images share one field: a file
picker and drop target, Unsplash while the site has it on, a preview, and
Remove. When the site has Pintura configured, a set image also offers Edit,
which opens it in Pintura; Save and close uploads the result and writes it as an
upload would. While Pintura is open or the edited image is uploading, Edit and
Remove are disabled and the preview shows the upload in progress. An edited
image that fails to upload is reported, leaves the original in place, and is not
counted as a saved edit.

## Dates and times

The publish date in the settings panel and the schedule in the publish flow
share one pair of fields, edited in the site's timezone. The date is typed as
`YYYY-MM-DD` or picked from a calendar. The button at the start of the field
opens the calendar with focus on the chosen day; the arrow keys move between
days, Enter picks one, and focus returns to the button. A click on the field
also opens the calendar but leaves the caret in the field: typing closes it,
and clicking back into the field keeps it open.

A typed date is taken on blur or Enter, and an emptied field puts back the date
already held. In the settings panel Escape puts it back too; in the publish
flow Escape closes the flow instead. With the calendar open, the first Escape
only closes the calendar. Text in another format is refused with
`Invalid date format, must be YYYY-MM-DD`, and a day the calendar does not
have, such as 30 February, with `Invalid date`. A refused date stays in the
field, marked invalid and described by the message, until it is corrected or
discarded; Cmd/Ctrl+S from the field saves nothing meanwhile.

A new date keeps the time of day already held, and where that time does not
exist on the new day because the clocks go forward, it moves forward with them.
Typing reaches days the calendar does not offer: a publish date still to come
is refused as a chosen time would be, and a schedule earlier than the flow
allows moves up to the earliest it does.

## Save feedback

The header's Update button, a contributor's Save button and Cmd/Ctrl+S report
the save they asked for. Each clears the previous save toast when it starts and,
once the server acknowledges the save, shows one describing the post's new
status against the status it had before: "Post updated" with a "View on site"
link for a published post, "Post updated" for a sent one and "Post saved" for a
draft. A scheduled post's toast reads "Post scheduled" and says when it will be
published or sent in the site's timezone, with the newsletter's audience when
one goes out, and links to the post's preview. A save that fails, is dropped or
is superseded shows nothing, as does one that lands with a different status
because a publish or revert ran ahead of it, and autosaves and the saves the preview and
publish flows make first are never reported.

The Update button reads "Updating..." while its save runs, "Updated" for two and
a half seconds once it lands and "Retry" after a failure; a contributor's Save reads
"Saving" and "Saved". Cmd/Ctrl+S leaves both buttons alone. Reverting a post to
a draft from the update flow shows "Post reverted to a draft." ("Page" for a
page).

## Snippets

`use-post-snippets.tsx` gives Koenig's card menu every snippet on the site,
sorted by name. Owners, Administrators, Editors and Super Editors can also save a selection as
a snippet, overwrite one by saving under its name and delete one, each after a
confirmation; Authors and Contributors can only insert them.

Koenig inserts a snippet from its lexical clipboard JSON. Older snippets don't
always store that: some hold it encoded twice, and some only have mobiledoc.
`toSnippetValue()` in `snippet-value.ts` unwraps the first and converts the
second when the list is read, without writing anything back, so a snippet the
editor cannot convert to any content is left out of the menu.

## Email size

Inboxes clip an email of 100kB or more behind a "View entire message" link, so
the editor estimates the size of the newsletter a post would be sent as and
warns once it reaches that size: as an icon beside the word count that gives
the size when clicked or tapped, in the publish flow's options while it will send an email, and
above the email preview.

The estimate starts from the email preview endpoint, read without a newsletter
or audience, and measures its HTML in bytes. Every link between the post content
markers that starts with `http://`, `https://` or `/` is then counted at the
length the send rewrites it to for click tracking, the site URL plus 50
characters; replacement tokens and `#` are left alone. `estimateEmailSize()` is
that calculation.

Only a saved post that could still go out as a newsletter is checked: not a page,
not a published post, not one with an email record or marked email-only, and
not when the site has newsletters turned off in its default recipients. There is
no role gate. The version the editor opens with is estimated at once, and each
later saved version about 500ms after it loads; every version is estimated once,
in a cache entry of its own that the three places share. A failed estimate shows no
warning.

## Adding a settings section

1. Add the section's id to `SETTINGS_SECTION_ORDER` in `settings/sections.ts`,
   in the position it should hold in the panel.
2. Write the section component in `settings/`. It takes the narrow port from
   `settings/editor-settings-port.ts`, not the whole editing handle; a section
   that opens a pane rather than rendering fields in the list uses
   `SettingsSubview`.
3. Add an entry for the id to the `sections` map in
   `settings/post-settings-sidebar.tsx`. The map is also where the section's
   role gate goes: a role that cannot write the section gets no entry.
4. If the section writes a post field the session does not carry yet, add its
   key to `SETTINGS_FIELD_KEYS` in `session/settings-fields.ts`, together with
   the identity it is written as and any rule the save-time validator should
   apply to it.
5. Add the section's selector constants to the shared registry at
   [`packages/testing/test-data/src/selectors/editor.ts`](../../../../packages/testing/test-data/src/selectors/editor.ts),
   so the acceptance specs and the e2e page objects break together.
6. Add the section's locators and gestures to `editor.screen.ts`, consuming
   those constants.
7. Add an acceptance spec beside the others, named
   `editor-settings-<section>.acceptance.test.tsx`.
8. Describe the section in [`settings/README.md`](settings/README.md), in the
   place `SETTINGS_SECTION_ORDER` gives it.

## Writing an editor acceptance test

Editor acceptance specs are `*.acceptance.test.tsx` files in this directory, and
they follow the conventions in
[the acceptance tier README](../../test-utils/acceptance/README.md). What is
specific to the editor lives in `apps/admin/test-utils/acceptance/editor.ts`:

- `fakeEditorChrome()` serves the supporting reads the header, the card
  configuration and the email size check make, so a spec never mentions them.
- `fakeEmailPreview(bytes)` serves every post's email at a given size; a later
  call replaces the earlier one, which is how a spec changes the size between
  saves.
- `fakeEditorPost(overrides, normalize)` serves one post: later reads return what
  earlier saves sent, each save advances the collision token, and the capture it
  returns is what a spec asserts writes against. `normalize` stands in for a
  server that rewrites what it was sent.
- `submittedPost(capture, index)` reads the fields of a captured save, the most
  recent one by default.
- `editorReadLanded(queryClient, version)` resolves once a read of `version` at
  its `updated_at` has landed in the query cache and the editor has handled it,
  which is the only sign of a read the editor refuses. The copy a save writes
  into the cache does not count while the read after that save is in flight.
  `renderAdminApp` resolves with the `queryClient`.
- `fakeUnsplashPhotos()` serves one photo in the shape the picker lays out and
  inserts, and `UNSPLASH_PICKED` is the rendition the picker asks for.

- `fakePintura()` stands in for an already loaded Pintura script and
  stylesheet, records the images the editor is opened on and ends an edit with
  `save(file)`; it removes itself when the test finishes.

Four presets adjust the boot for a spec whose subject needs it. `withoutAutosave()`
boots with a debounce no run reaches, so a debounced autosave cannot be what an
assertion sees; `withFastAutosave()` is its opposite, for specs whose subject is
autosave itself; `withoutUnsplash()` boots a site with the integration off; and
`withPintura()` boots a site with Pintura configured, for use with
`fakePintura()`.

Assert writes with `await expect(saveApi).toHaveSavedFields({slug: "new-slug"})`,
which waits for the write and compares the named fields of the latest payload;
the other matchers the tier provides are listed in its README. Gesture through
`editorScreen` in `editor.screen.ts` rather than reaching for locators directly.
