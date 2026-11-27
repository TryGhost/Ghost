## 2.4.0

### Minor Changes

- Added web/email visibility settings to the image, gallery, video, audio, file, callout, header, product, toggle, button and bookmark cards, so content can be shown in the email but hidden on the published post (and vice versa, or limited to a member segment)

  Every card with settings now has a single Edit button that opens one settings panel, with Visibility as its last tab. Image, gallery and bookmark cards open it with Edit, a double-click or Cmd+Enter, and the visibility indicator of wide and full-width cards now sits inside the card. The embed card no longer enters an empty edit mode.

  Visibility settings only appear for cards listed in `cardConfig.visibilityCardTypes` when it is set, so a host can hide settings its backend can't honour yet. Dragging images together into a gallery, or into an existing gallery, only works when their visibility matches, and an image dragged out of a gallery keeps the gallery's visibility.

### Patch Changes

- Updated dependencies

- Fixed the editor's own controls staying live in a read-only editor. With Lexical's editable flag off on the top-level editor, the format toolbar, card menus and pickers are not shown, no card can be selected, edited, inserted, deleted or dragged, cards take no pointer or click input, no keys other than Ctrl/Cmd shortcuts and Tab, no file from a dialog opened earlier and no new focus, placing the cursor no longer triggers text shortcuts, and anything dropped on the document is refused, while text, including text in cards, can still be selected and copied. A picker or field a card had open stays closed once the editor is editable again, other than the Unsplash and GIF selectors. Also fixed the Cmd/Ctrl+K link shortcut leaving a stale handler behind when a format toolbar unmounts.

- Fixed card captions taking over typing in editable fields outside the editor

- Added a `visibility` property to the image, gallery, video, audio, file, callout, header, product, toggle, button and bookmark nodes, and applied it when rendering web and email output. Nodes also expose `hasVisibility()`. The editor doesn't offer these settings yet, so existing content renders the same.

  Audio, video and file cards that are restricted on the web link email readers straight to the media file, since the post may not show them the card.

- Updated dependencies
