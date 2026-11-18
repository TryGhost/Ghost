---
"@tryghost/kg-default-nodes": patch
---

Fixed header, call-to-action, product, signup and email button values containing special characters rendering incorrectly. Button text is now always written as text, and a colour that isn't a hex value, keyword, `rgb()` or `hsl()` is ignored.
