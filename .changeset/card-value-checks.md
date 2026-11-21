---
"@tryghost/kg-default-nodes": patch
"@tryghost/kg-lexical-html-renderer": patch
---

Fixed rendering of invalid heading tags, list starts and card visibility settings. A heading whose tag isn't a heading tag renders as `h2`, a list start that isn't a whole number is left out, and a card with an unrecognised web visibility setting is hidden.
