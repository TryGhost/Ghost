---
"@tryghost/kg-default-nodes": patch
---

Fixed card visibility settings with a missing channel or value being reset to public. A card whose visibility gives only `web` or only `email`, leaves out `nonMember`, or has a null `memberSegment` now keeps the values it was given, and only the missing ones take the default.
