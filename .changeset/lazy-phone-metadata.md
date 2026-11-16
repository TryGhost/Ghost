---
"@tryghost/metafield-types": patch
---

In Node, libphonenumber-js now loads the first time a phone number is read rather than when the package is imported, so a server that never reads one doesn't hold its metadata. Bundles still load it up front.
