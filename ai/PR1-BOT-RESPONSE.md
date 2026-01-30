# PR1 Bot Response

Fixed all the issues:

1. **Duplicate @returns** - Removed the generic one, kept the specific `Promise<{id: string}>` definition
2. **AdapterManager JSDoc** - Added 'email' to the list of supported types
3. **require placement** - Moved `@tryghost/errors` to top of file
4. **Test suite name** - Renamed from "integration with AdapterManager" to "module exports" since it just tests the module can be required and instantiated

All changes pushed in commit 2b2cb71c21.
