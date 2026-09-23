# Post editor

`apps/admin/src/editor/` is the React post and page editor: the screen, the
Koenig surface it wraps, the settings sidebar beside it, and the publish and
preview flows it opens. `api.ts` is the domain's public surface — the shell
mounts the screen lazily through it and everything else here is internal.

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
| `editor-header-actions.tsx`, `editor-status.tsx` | The header's publish and preview controls, and the line saying where the post stands                                 |
| `card-config.ts`, `use-post-card-config.ts`      | What Koenig's cards are told about the site and the post they are being edited in                                    |

Two small modules are shared across all of the above. `request-options.ts`
carries the editor's opt-out from the transport's session-expiry redirect, which
every request the editor makes passes: leaving the page would take unsaved
content with it, so the editor surfaces an expired session itself. The opt-out
belongs to whichever component starts a fetch rather than to the cache entry, so
a component reading a query key it shares with a screen outside the editor opts
out too. `layering.ts` carries the z-index a confirmation dialog opened from
inside another editor surface needs in order to paint above it.

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

- `fakeEditorChrome()` serves the supporting reads the header and the card
  configuration make, so a spec never mentions them.
- `fakeEditorPost(overrides, normalize)` serves one post: later reads return what
  earlier saves sent, each save advances the collision token, and the capture it
  returns is what a spec asserts writes against. `normalize` stands in for a
  server that rewrites what it was sent.
- `submittedPost(capture, index)` reads the fields of a captured save, the most
  recent one by default.
- `fakeUnsplashPhotos()` serves one photo in the shape the picker lays out and
  inserts, and `UNSPLASH_PICKED` is the rendition the picker asks for.

Three presets adjust the boot for a spec whose subject needs it. `withoutAutosave()`
boots with a debounce no run reaches, so a debounced autosave cannot be what an
assertion sees; `withFastAutosave()` is its opposite, for specs whose subject is
autosave itself; and `withoutUnsplash()` boots a site with the integration off.

Assert writes with `await expect(saveApi).toHaveSavedFields({slug: "new-slug"})`,
which waits for the write and compares the named fields of the latest payload;
the other matchers the tier provides are listed in its README. Gesture through
`editorScreen` in `editor.screen.ts` rather than reaching for locators directly.
