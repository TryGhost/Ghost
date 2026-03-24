# Streaming Post Analytics Export

## Problem

The current `PostsExporter.exportStream()` wraps an in-memory array in a Readable stream, providing no actual streaming benefit. For sites with thousands of posts, the entire dataset is buffered before the first byte is sent to the client. The members exporter already solves this problem with a true Knex streaming pipeline — we should follow the same pattern.

## Design

Three phases: harden test coverage on the existing export, implement the streaming refactor, then add streaming-specific tests.

---

### Phase 1: Test Coverage Hardening

**Goal:** Pin down the output contract of `PostsExporter.export()` so the refactor has a regression safety net.

**File:** `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

**New test cases to add (no production code changes):**

1. **Multiple authors/tags** — post with 2+ authors and 2+ tags produces comma-joined strings (`"Author A, Author B"`)
2. **`sent` status** — maps to `"emailed only"`, email analytics columns present
3. **`scheduled` status** — email data cleared (same as draft behavior)
4. **Mixed-status multi-post export** — published + draft posts together; column presence driven by global settings, not per-row data
5. **`members_track_sources` disabled** — hides `signups` and `paid_conversions` columns
6. **Empty export** — no posts match filter, returns `[]`
7. **Complete field set assertion** — asserts `Object.keys(posts[0])` matches expected ordered field list; catches any field addition/removal/reordering
8. **Tiers visibility in full export row** — post with `visibility: 'tiers'` produces correct `post_access` string
9. **Email recipient filter in export context** — full export with labels/tiers model data present, email with `recipient_filter: 'label:vip'` resolves to human-readable label name in the export row (distinct from the isolated `humanReadableEmailRecipientFilter` unit tests — this verifies that labels/tiers are correctly passed through the full `export()` flow)

---

### Phase 2: Streaming Refactor

**Goal:** Replace the fake stream with a true DB-to-response streaming pipeline.

#### `posts-exporter.js` — new `exportStream()` implementation

**New constructor dependency:** `knex` (the Knex instance from `require('../../data/db').knex`), injected via constructor alongside existing deps. Wired in `posts-service-instance.js`.

**Pipeline:**

1. **Load reference data upfront** (small tables, safe to buffer):
   - Newsletters via `knex('newsletters')` — plain objects (not Bookshelf models)
   - Labels via `knex('labels')` — plain objects
   - Tiers/products via `knex('products')` — plain objects

   **Note:** Since these are plain objects (not Bookshelf models with `.get()`), several existing methods must be adapted to work with plain `row.property` access instead of `model.get('property')`:
   - `humanReadableEmailRecipientFilter` — label/tier lookups use `.get('slug')` / `.get('name')`
   - `postAccessToString` — uses `post.get('visibility')` and `post.related('tiers')` with `tier.get('name')`
   - Newsletter lookups — use `.get('id')`, `.get('name')`, `.get('feedback_enabled')`

   Extract stream-compatible versions of these helpers that accept plain objects, or create a thin adapter layer.

2. **Resolve filtered post IDs** — use existing `findPage()` with:
   - Minimal `withRelated: []` (no relations)
   - `columns: ['id']` to fetch only IDs
   - `limit: 'all'` to get all matching IDs (not just the first page)

   The user-provided `filter` is applied here via NQL. The user-provided `order` and `limit` are applied to the streaming Knex query in step 3 (not here), so the ID set is the full filtered set and ordering/limiting happens at the stream level.

3. **Stream base post rows** — `knex('posts').select('id', 'title', 'status', 'visibility', 'featured', 'created_at', 'published_at', 'updated_at', 'newsletter_id', 'uuid').whereIn('id', ids).orderByRaw(...)` piped through `.stream()`.

   If `limit` was provided, apply it to this query. If `order` was provided, translate it to a Knex `.orderByRaw()`.

4. **Batch via Transform stream** — group rows into batches of 1000 (matching the members exporter batch size for consistency).

5. **Enrich each batch** via parallel Knex queries:
   - `posts_authors` joined with `users` for author names (grouped by post_id)
   - `posts_tags` joined with `tags` for tag names (grouped by post_id)
   - `emails` for email stats (email_count, opened_count, feedback_enabled, track_clicks, recipient_filter)
   - Count queries for clicks, signups, paid conversions, positive/negative feedback
   - `posts_products` joined with `products` for tier names (for post_access)

6. **Compute post URL** — the existing `getPostUrl` calls `url.forPost()` which does two things: (a) `urlService.getUrlByResourceId(id)` for the base URL, and (b) a fallback for draft/scheduled posts that generates `/p/:uuid` or `/email/:uuid` preview URLs when the URL service returns `/404/`.

   For the streaming path, replicate this logic using plain row data. The streaming base query (step 3) must also select `uuid`. The enrichment step should join `posts_meta` to get `email_only` for the fallback. Then compute the URL as:
   - Call `urlService.getUrlByResourceId(row.id, {absolute: true})`
   - If the result matches `/404/` and `row.status` is not `published`/`sent`: generate `/p/:uuid` or `/email/:uuid` fallback (checking `posts_meta.email_only`)

   Inject `urlService` and `urlUtils` as dependencies (or a `getUrlByPostId(row)` function that encapsulates this).

7. **Map each row** to the same flat export object shape that `export()` produces today.

8. **Apply conditional column removal** — compute the set of removable columns **upfront** (before streaming begins), since it depends only on global settings (members enabled, feedback enabled, track clicks, track opens, track sources, paid members, newsletter count) and the reference data loaded in step 1. Then delete those keys from each row during the per-row mapping in step 7. This avoids the current `export()` pattern of iterating over all rows after the fact.

**Existing `export()` method preserved unchanged** for any non-streaming callers.

#### `posts-service-instance.js` — wire up knex

```javascript
const {knex} = require('../../data/db');

const postsExporter = new PostsExporter({
    models: { ... },
    knex,
    getPostUrl(post) { ... },
    settingsCache,
    settingsHelpers
});
```

#### `posts-service.js`

New method:

```javascript
async exportStream(frame) {
    return await this.postsExporter.exportStream(frame.options);
}
```

#### `ghost/core/core/server/api/endpoints/posts.js`

- `exportCSV.response` gains `stream: true` (this flag is documentary/conventional — it is not checked by the API framework but signals intent to future readers, matching the members endpoint pattern)
- `exportCSV.query` calls `postsService.exportStream(frame)` instead of `postsService.export(frame)`
- Returns `{ data: stream }` instead of `{ data: array }`

#### `ghost/core/core/server/api/endpoints/utils/serializers/output/posts.js`

`exportCSV` updated to handle streams. When `frame.response` is set to a function, Ghost's HTTP layer (`http.js`) detects `typeof result === 'function'` and calls it with `(req, res, next)`, skipping its own header-setting code. Therefore the stream function **must set its own headers**:

```javascript
exportCSV(models, apiConfig, frame) {
    if (models.data && typeof models.data.pipe === 'function') {
        frame.response = function streamResponse(req, res, next) {
            const {createCSVTransform} = require('./posts-csv-transform');
            const csvTransform = createCSVTransform();

            models.data.on('error', err => next(err));

            const datetime = (new Date()).toJSON().substring(0, 10);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition',
                `attachment; filename="post-analytics.${datetime}.csv"`);

            models.data.pipe(csvTransform).pipe(res);
        };
        return;
    }
    // Fallback for non-stream data
    frame.response = papaparse.unparse(models.data);
}
```

#### Files NOT changed

- `posts-csv-transform.js` — introduced in the prior commit on this branch; already works for streaming (object mode in, string out, correct for piping to `res`)
- The existing `export()` method — preserved as-is

---

### Phase 3: Streaming-Specific Tests

**Goal:** Verify the streaming pipeline produces identical output to the buffered path and handles stream-specific concerns.

#### Mock strategy

Extend `utils/index.js` `createDb` helper to support:
- `.stream()` returning a Readable of plain row objects
- `.whereIn()`, `.groupBy()`, `.join()`, `.orderByRaw()` for batch enrichment queries
- `knex.raw()` for aggregations

#### `posts-exporter-streaming.test.js` (replace current fake-stream tests)

1. **Contract parity tests** — for each scenario tested against `export()` in Phase 1, run the equivalent through `exportStream()` and assert identical output (same fields, same values, same conditional column removal)
2. **Stream behavior tests:**
   - Returns a Readable in object mode
   - Emits objects one at a time (not buffered arrays)
   - Empty result set — stream ends immediately
   - Knex stream error — error propagates through pipeline

#### `posts-export-csv.test.js` (minor additions)

- End-to-end stream test: stream of post objects → CSV transform → collected string produces valid CSV matching what `papaparse.unparse(array)` would produce for the same data
