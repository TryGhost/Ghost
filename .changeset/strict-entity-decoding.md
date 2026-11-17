---
"@tryghost/kg-default-nodes": patch
---

Fixed links whose query strings look like HTML entities without a semicolon, such as `&region=` or `&para=`, being corrupted in rendered cards.
