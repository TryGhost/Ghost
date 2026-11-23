---
"@tryghost/koenig-lexical": minor
"@tryghost/kg-default-nodes": patch
---

Added web/email visibility settings to the image, gallery, video, audio, file, callout, header, product, toggle, button and bookmark cards, so content can be shown in the email but hidden on the published post (and vice versa, or limited to a member segment)

Every card with settings now has a single Edit button that opens one settings panel, with Visibility as its last tab. Image, gallery and bookmark cards open it with Edit, a double-click or Cmd+Enter, and the visibility indicator of wide and full-width cards now sits inside the card. The embed card no longer enters an empty edit mode.

Visibility settings only appear for cards listed in `cardConfig.visibilityCardTypes` when it is set, so a host can hide settings its backend can't honour yet. Dragging images together into a gallery, or into an existing gallery, only works when their visibility matches, and an image dragged out of a gallery keeps the gallery's visibility.
