# CSV content import

CSV imports stage their source privately in `storage:imports` and process it in
one job. Each worker handles one CSV import at a time. `ContentCSVImportJob` opts
into the jobs service's restart replay with `static replayAfterRestart = true`.
A replayed job keeps its import ID and resumes after its durable checkpoint;
post deduplication protects rows written before an interrupted journal flush.

After validating the request file, the importer saves it under
`content-csv-import/<site-namespace>/<import-id>/` in `storage:imports`.
The manifest and job carry the key returned by the adapter and the original
filename. Each worker streams the source to a temporary file and removes that
copy after its attempt. Keeping the source under the import's directory lets
expiry cleanup remove an abandoned upload even if Ghost stopped before
recording its final key.

The service root supplies file access for worker downloads, ZIP extraction and
private scratch data. Boot supplies the cleanup job constructor to the
central handler registry.

Recovery requires accessible durable imports storage and job redelivery.
Enabling both `services:jobs:outbox.enabled`
and `services:jobs:outbox.keepUntilSettled` on MySQL lets the jobs service retain
unfinished jobs and replay them after their leases expire. Without retained outbox
rows, recovery after enqueue depends on the configured backend. Imports storage
must be shared when replay can run on another server. The CSV importer does not
enable these settings. Drain outstanding CSV jobs before deploying payload or
queue changes and deploy matching Core and workers together.

Upload ownership, expiry, and submission state live in private manifests in
the same storage adapter. Confirmation, cancellation, and completion claims
use conditional metadata writes so they can coordinate across workers. Custom
imports adapters must support these writes, streaming reads and writes, prefix
listing, and atomic metadata replacement.

ZIP inspection and extraction use `@tryghost/zip`, with the CSV import's size,
entry-count and duplicate-path checks. Classification extracts to a private
temporary directory and removes it before returning or rejecting. CSV preview
extraction is also cleaned after inspection, including validation failures.
The upload middleware removes the request's temporary ZIP when the response
finishes. Only a successful inspection retains a staged source for mapping;
Cancel, Start over or the 24-hour expiry removes an unclaimed staged upload.

CSV sources and journal parts use Papa Parse's streaming callbacks so malformed
quoting is reported instead of discarded by its Node pipe mode. The reader pauses
both the parser and its input while the next row waits to be consumed. Source
records retain the 8 MiB raw-byte limit; malformed quotes reject inspection or
stop a running import with partial results, rather than importing recovered cells.

## Import progress

Poll `GET /ghost/api/admin/posts/upload/:import_id/progress/` using the ID returned
by submission. The endpoint requires the CSV Labs flag, content import permission,
and the same user or integration that submitted the upload. Responses are private
and must not be cached.

```json
{"meta":{"import_id":"...","status":"running","processed":2500,"total":5000}}
```

`processed` counts committed data records of every outcome: created, updated,
skipped and failed. It follows the durable checkpoint and can lag behind processing
until the next journal flush. `total` comes from inspection; direct uploads without
inspection return `null` until the full source has been processed. A terminal
failure may therefore have an unknown total.

Statuses are `queued`, `running`, `finalizing`, `complete` and `failed`. `running`
is the last recorded execution state, not a worker heartbeat. Row processing at
100% can still be `finalizing` while reports and the completion email are prepared.
`complete` means processing finished, even if individual rows failed; `failed`
means an infrastructure or unexpected processing error stopped the run.

Final progress survives journal cleanup in the existing upload manifest, until
its original 24-hour expiry. Accepted imports remain readable beyond that expiry
while queued or running. Missing, expired or another owner's imports return 404.

Run the recovery suite from the repository root with the local MySQL
test service available. It kills isolated workers after a post commit and
checks that retained outbox jobs resume raw CSV and ZIP imports from durable
checkpoints, including respecting cancellation requested before restart.

```sh
pnpm --dir ghost exec vitest run -c vitest.config.db.ts \
  --project e2e-isolated test/e2e-server/csv-import-recovery.isolated.test.ts
```

## Manual 1 GiB benchmark

Run this separately from coverage and other tests. Allow at least 4 GiB of
temporary disk space for the generated input, request spool, staged source and
worker copy. The fixture uses 256 records with an unused padding column. It
exercises upload, staging, parsing, post writes, reporting and cleanup through
the Admin API. The test removes its input and uses the isolated test database.

```sh
CSV_IMPORT_BENCHMARK=1 pnpm --dir ghost exec vitest run -c vitest.config.db.ts \
  --project e2e-api test/e2e-api/admin/csv-import-benchmark.test.js
```

The benchmark prints elapsed wall time, starting RSS, the highest RSS sampled
during the import and the process RSS high-water mark. The high-water mark
includes Ghost startup. Record the storage adapter, jobs backend and machine
alongside results when comparing runs.
