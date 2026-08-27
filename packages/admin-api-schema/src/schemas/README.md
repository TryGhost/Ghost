# JSON Schema structuring convention

When adding a new schema or definition following naming convention should be followed:

1. Name the file containing JSON definitions in the same way as resource is named in the API (aka "docName" in controller config). For example, for [tags](../../../../ghost/core/core/server/api/endpoints/tags.js#L13) the definitions file would be `tags.json`
2. Name the file containing JSON schema (which usually references "definitions") using following convention `{resourceName}-{methodName}.json`. For example, for [tags.edit](../../../../ghost/core/core/server/api/endpoints/tags.js#L97) method file would be named `tags-edit.json`
3. Import the schema and add it to the registry in `index.ts`. Add action schemas to `actionSchemaNames` so they are returned by `list()`.

The need to have separate "definitions" and "schema" files comes from [schema reusability pattern](https://cswr.github.io/JsonSchema/spec/definitions_references/) that JSON schema allows for through $ref keyword. In some cases, the pattern doesn't quite work out because of limitations of the syntax (cannot override parts of referenced definition). Generally try to reuse as much schema as possible to avoid duplication unless it becomes painful to do so.
