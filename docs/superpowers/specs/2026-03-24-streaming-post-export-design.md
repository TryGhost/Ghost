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
9. **Email recipient filter in export context** — email with `recipient_filter: 'label:vip'` resolves to human-readable label name in export row

---

### Phase 2: Streaming Refactor

**Goal:** Replace the fake stream with a true DB-to-response streaming pipeline.

#### `posts-exporter.js` — new `exportStream()` implementation

**New constructor dependency:** `knex` (the Knex instance), injected alongside existing deps.

**Pipeline:**

1. **Load reference data upfront** (small tables, safe to buffer):
   - Newsletters via `knex('newsletters')`
   - Labels via `knex('labels')`
   - Tiers/products via `knex('products')`

2. **Resolve filtered post IDs** — use existing `findPage()` with minimal columns (`id` only) to leverage Ghost's NQL filter system without loading full Bookshelf models.

3. **Stream base post rows** — `knex('posts').select(...).whereIn('id', ids).stream()`

4. **Batch via Transform stream** — group rows into batches of ~500 for efficient relation lookups.

5. **Enrich each batch** via parallel Knex queries:
   - `posts_authors` joined with `users` for author names
   - `posts_tags` joined with `tags` for tag names
   - `emails` for email stats (email_count, opened_count, feedback_enabled, track_clicks, recipient_filter)
   - Count queries for clicks, signups, paid conversions, positive/negative feedback
   - `posts_products` joined with `products` for tier names

6. **Map each row** to the same flat export object shape that `export()` produces today.

7. **Apply conditional column removal** — same logic as current `export()`: hide columns based on global settings (members enabled, feedback enabled, track clicks, track opens, track sources, paid members, newsletter count).

**Existing `export()` method preserved unchanged** for any non-streaming callers.

#### `posts-service.js`

New method:

```javascript
async exportStream(frame) {
    return await this.postsExporter.exportStream(frame.options);
}
```

#### `ghost/core/core/server/api/endpoints/posts.js`

- `exportCSV.response` gains `stream: true`
- `exportCSV.query` calls `postsService.exportStream(frame)` instead of `postsService.export(frame)`
- Returns `{ data: stream }` instead of `{ data: array }`

#### `ghost/core/core/server/api/endpoints/utils/serializers/output/posts.js`

`exportCSV` updated to handle streams:

```javascript
exportCSV(models, apiConfig, frame) {
    if (models.data && typeof models.data.pipe === 'function') {
        frame.response = function streamResponse(req, res, next) {
            const {createCSVTransform} = require('./posts-csv-transform');
            const csvTransform = createCSVTransform();
            models.data.on('error', err => next(err));
            models.data.pipe(csvTransform).pipe(res);
        };
        return;
    }
    // Fallback for non-stream data
    frame.response = papaparse.unparse(models.data);
}
```

#### Files NOT changed

- `posts-csv-transform.js` — already works for streaming
- The existing `export()` method — preserved as-is

---

### Phase 3: Streaming-Specific Tests

**Goal:** Verify the streaming pipeline produces identical output to the buffered path and handles stream-specific concerns.

#### Mock strategy

Extend `utils/index.js` `createDb` helper to support:
- `.stream()` returning a Readable
- `.whereIn()`, `.groupBy()`, `.join()` for batch enrichment queries
- `knex.raw()` for aggregations

#### `posts-exporter-streaming.test.js` (replace current fake-stream tests)

1. **Contract parity tests** — for each scenario tested against `export()` in Phase 1, run the equivalent through `exportStream()` and assert identical output (same fields, same values, same conditional column removal)
2. **Stream behavior tests:**
   - Returns a Readable in object mode
   - Emits objects one at a time (not buffered arrays)
   - Empty result set — stream ends immediately
   - Knex stream error — error propagates through pipeline
   - Backpressure — pausing the consumer pauses upstream consumption

#### `posts-export-csv.test.js` (minor additions)

- End-to-end stream test: stream of post objects → CSV transform → collected string produces valid CSV matching what `papaparse.unparse(array)` would produce for the same data
