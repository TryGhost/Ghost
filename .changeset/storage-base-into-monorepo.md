---
"ghost-storage-base": major
---

Moved ghost-storage-base into the monorepo and converted it to ESM

The package is now ESM-only and exports `StorageBase` as a named export.
Adapters must update their imports:

```js
// Before
const StorageBase = require('ghost-storage-base');

// After
const {StorageBase} = require('ghost-storage-base');
```
