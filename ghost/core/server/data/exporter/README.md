# Data exporters

This directory owns database JSON exports and site archive construction. The
archive builder is created by its caller; it does not have a boot-managed
instance or initialization hook.

## Entry points and callers

- [index.js](index.js) retains the existing `doExport`, `fileName`,
  `BACKUP_TABLES` and `TABLES_ALLOWLIST` exports for database JSON exports.
- [site-exporter.ts](site-exporter.ts) exports `SiteExporter` and the
  `SiteExporterDeps` type. The [exports endpoint](../../api/endpoints/exports.js)
  constructs it for each download, supplying content, CSV, theme and routing
  callbacks. Construction retains the callbacks without invoking them.
- [export-components.ts](export-components.ts) defines the synchronous and
  asynchronous component lists. The exports endpoint and
  [export requests](../../services/export-requests/export-requests-service.ts)
  share those definitions. The arrays are compile-time readonly, not frozen
  at runtime; the asynchronous list adds media to the synchronous list.

## Archive ownership and failures

`createArchive()` lazily loads Archiver and immediately returns a new archive
stream. Each archive has its own selected-component set and cleanup callbacks;
the caller connects it to the response. Component callbacks need their existing
database and service dependencies ready. They retain their own configuration
and data-read timing; the archive is not a cross-component database snapshot.

Component acquisition failures are logged and skipped. Individual theme or
YAML failures preserve the remaining files. Source-stream errors and archive
population/finalization errors destroy the archive. Closing it destroys acquired
CSV sources and launches theme cleanup. Sources acquired after closure are
destroyed; late theme acquisition invokes its cleanup. Cleanup rejection is
swallowed, and closure does not await cleanup or cancel all pending content/YAML
callbacks.

## Tests and remaining audit gaps

The [archive unit tests](../../../../test/unit/server/data/exporter/site-exporter.test.ts)
exercise real archives, selected components, partial failures, stream errors,
manual destruction and late theme cleanup. Manual destruction uses local streams
and files; it does not prove real socket-disconnect or database-release behavior.
The [download HTTP tests](../../../../test/e2e-api/admin/exports-download.test.js)
cover full/subset archives and artifacts accepted by existing import endpoints.
The [API validation tests](../../../../test/e2e-api/admin/exports.test.js) and
[export request tests](../../../../test/e2e-api/admin/exports-request.test.ts)
cover selection, permissions and the asynchronous request consumer.

The [service audit before relocation](https://github.com/TryGhost/Ghost/blob/c186e127ffe3c6d93a1226a586685709b3214025/ghost/core/server/services/service-inventory.yaml#L3476)
preserves all eight contract facets and their source/test evidence. Its recorded
audit revision is `bf6a3ea2e32b7b551980c02c745e3c9b74e3ea0e`; relocating these
files does not constitute a new full contract audit. Still-open obligations are:

- Characterize repeated/overlapping archives, retained callback dependencies and
  dependency readiness. Successful import responses do not prove restored-data equality.
- Cover real HTTP disconnects and slow readers through the archive, CSV transforms
  and database sources, including late acquisitions, multiple theme cleanups and
  cleanup/finalization errors.
- Characterize acquisition/drain ordering, partial-export reporting and behavior
  under concurrent writes/settings changes. Content is buffered and several streams
  can be active; there is no global size/concurrency bound or operation drain registry.
- Cover temporary-directory creation/removal failures and nested theme-compression
  output errors, early stat failures and ignored finalization rejection.
- Strengthen artifact assertions: exact nonempty member rows, complete selected
  contents, sensitive-setting fixture preconditions and fully restored data.

From `ghost/`, run the archive unit tests:

```sh
pnpm exec vitest run test/unit/server/data/exporter/site-exporter.test.ts
```

Run the HTTP tests from the same directory:

```sh
pnpm exec vitest run -c vitest.config.db.ts \
  test/e2e-api/admin/exports-download.test.js \
  test/e2e-api/admin/exports.test.js \
  test/e2e-api/admin/exports-request.test.ts
```
