## 2.4.0

### Minor Changes

- Added `utils.visibility.hasRestrictedCards()`, which reports whether any card in a serialized Lexical document has restricted visibility.

- Added a `visibility` property to the image, gallery, video, audio, file, callout, header, product, toggle, button and bookmark nodes, and applied it when rendering web and email output. Nodes also expose `hasVisibility()`. The editor doesn't offer these settings yet, so existing content renders the same.

  Audio, video and file cards that are restricted on the web link email readers straight to the media file, since the post may not show them the card.

- Added web/email visibility settings to the image, gallery, video, audio, file, callout, header, product, toggle, button and bookmark cards, so content can be shown in the email but hidden on the published post (and vice versa, or limited to a member segment)

  Every card with settings now has a single Edit button that opens one settings panel, with Visibility as its last tab. Image, gallery and bookmark cards open it with Edit, a double-click or Cmd+Enter, and the visibility indicator of wide and full-width cards now sits inside the card. The embed card no longer enters an empty edit mode.

  Visibility settings only appear for cards listed in `cardConfig.visibilityCardTypes` when it is set, so a host can hide settings its backend can't honour yet. Dragging images together into a gallery, or into an existing gallery, only works when their visibility matches, and an image dragged out of a gallery keeps the gallery's visibility.

### Patch Changes

- Fixed header, call-to-action, product, signup and email button values containing special characters rendering incorrectly. Button text is now always written as text, and a colour that isn't a hex value, a keyword or a colour function such as `rgb()` or `hsl()` is ignored.

- Fixed rendering of invalid heading tags, list starts and card visibility settings. A heading whose tag isn't a heading tag renders as `h2`, a list start that isn't a whole number is left out, and a card with an unrecognised web visibility setting is hidden.

- Fixed audio, bookmark, embed and video card values containing special characters, such as quotes, `<` or `&`, rendering incorrectly, mostly in emails.

- Reverted keeping partial card visibility settings. A visibility setting with a missing channel or value is treated as public again.

- Exported the `RenderedVisibility` type for the normalized card visibility shape, and typed koenig-lexical's card visibility utilities against it
