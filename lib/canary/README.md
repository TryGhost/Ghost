# JSON Schema structuring convention

When adding a new schema or definition following naming convention should be followed:
1. Name the file containing JSON definitions in the same way as resource is named in the API (aka "docName" in controller config). For example, for [tags](https://github.com/TryGhost/Ghost/blob/2a921b86598184fcd5a2d95fefae4283bba1042a/core/server/api/canary/tags.js#L9) the definitions file would be `tags.json`
2. Name the file containing JSON schema (which usually references "definitions") using following convention `{resourceName}-{methodName}.json`. For example, for [tags.edit](https://github.com/TryGhost/Ghost/blob/master/core/server/api/canary/tags.js#L89) method file would be named `tags-edit.json`
3. Update `index.js` list with a new definition name

The need to have separate "definitions" and "schema" files comes from [schema reusability pattern](https://cswr.github.io/JsonSchema/spec/definitions_references/) that JSON schema allows for through $ref keyword. In some cases, the pattern doesn't quite work out because of limitations of the syntax (cannot override parts of referenced definition). Generally try to reuse as much schema as possible to avoid duplication unless it becomes painful to do so.
