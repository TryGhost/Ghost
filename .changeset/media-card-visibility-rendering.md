---
"@tryghost/kg-default-nodes": minor
"@tryghost/kg-default-transforms": patch
"@tryghost/kg-html-to-lexical": patch
"@tryghost/koenig-lexical": patch
---

Added a `visibility` property to the image, gallery, video, audio, file, callout, header, product, toggle, button and bookmark nodes, and applied it when rendering web and email output. Nodes also expose `hasVisibility()`. The editor doesn't offer these settings yet, so existing content renders the same.

Audio, video and file cards that are restricted on the web link email readers straight to the media file, since the post may not show them the card.
