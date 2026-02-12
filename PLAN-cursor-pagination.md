# Plan: Cursor/Keyset Pagination with Anchoring for Comments API

## Problem Statement

Ghost's comments system currently uses offset-based pagination (`page` + `limit`), which has several issues:

1. **Inconsistency during infinite scroll**: When new comments are added while a user is scrolling, items shift positions. The `comments-ui` app already works around this with a `firstCommentCreatedAt` timestamp filter hack.
2. **Performance degradation**: SQL `OFFSET` requires scanning and discarding rows, becoming slower as users paginate deeper into large comment threads.
3. **Fragile anchoring**: The permalink/deep-link feature (`#ghost-comments-{id}`) currently brute-force iterates through pages until the target comment is found — slow and unreliable for deeply nested comments.
4. **Two different pagination styles**: Top-level comments use page-based pagination while replies already use a pseudo-cursor pattern (`id:>'${afterReplyId}'`) via NQL filtering. This inconsistency complicates the codebase.

## Current State

### Backend (`ghost/core`)
- **Pagination**: `findPage()` method in `models/base/plugins/crud.js` delegates to `@tryghost/bookshelf-pagination` which uses `OFFSET/LIMIT` SQL
- **Response format**: `meta.pagination: { page, limit, pages, total }`
- **Comment ordering**: Top-level: `created_at DESC, id DESC`; Replies: `created_at ASC, id ASC`; "Best" sort: `count__likes DESC, created_at DESC`
- **Comment model**: `id` (24-char string, ObjectId-like), `created_at` (datetime), `parent_id` (nullable FK)
- **NQL filtering**: Mature filter system supporting complex queries, already used for reply cursor pattern

### Frontend (`apps/comments-ui`)
- **Top-level comments**: Page-based with "Load More" button, 20 per page, deduplication on append
- **Replies**: Already cursor-based using `filter=id:>'${afterReplyId}'` with `limit=100`
- **Sorting**: "Best" (`count__likes desc, created_at desc`), "Newest" (`created_at desc`), "Oldest" (`created_at asc`)
- **Anchoring**: Partial implementation via URL hash, iterates pages to find target comment
- **State**: React Context + useState, no React Query

### Admin (`apps/posts/src/views/comments/`)
- **Pagination**: React Query infinite queries, 100 per page, virtual scrolling
- **Hooks**: `useBrowseComments` from `admin-x-framework/src/api/comments.ts` built on `createInfiniteQuery`
- **Filtering**: URL-synced NQL filter builder (status, author, post, text, reported, date)

---

## Design

### Cursor Encoding

A cursor encodes the position in the result set as an opaque base64 string. For a given sort order, the cursor contains the sort key value(s) plus the tiebreaker `id`:

```
// For "created_at DESC, id DESC" ordering:
cursor = base64({ created_at: "2025-01-15T10:30:00Z", id: "65a8f3..." })

// For "count__likes DESC, created_at DESC, id DESC" ("Best" ordering):
cursor = base64({ count__likes: 42, created_at: "2025-01-15T10:30:00Z", id: "65a8f3..." })
```

The cursor is **opaque to clients** — they never parse it, only pass it back.

### API Changes

New query parameters on browse/replies endpoints:

| Parameter | Type | Description |
|-----------|------|-------------|
| `after` | string | Cursor: fetch items after this position (forward pagination) |
| `before` | string | Cursor: fetch items before this position (backward pagination) |
| `anchor` | string | Comment ID to center results around |
| `limit` | number | Items per page (unchanged, default 20) |
| `order` | string | Sort order (unchanged) |
| `filter` | string | NQL filter (unchanged) |

The `page` parameter continues to work for backward compatibility. When `after` or `before` is provided, `page` is ignored and cursor mode is used.

### Response Format Changes

When cursor pagination is used, the `meta.pagination` shape changes:

```json
{
  "comments": [...],
  "meta": {
    "pagination": {
      "limit": 20,
      "total": 150,
      "next": "eyJjcmVhdGVkX2F0Ijo...",
      "prev": "eyJjcmVhdGVkX2F0Ijo...",
      "page": null
    }
  }
}
```

- `next`: Cursor string for the next page (null if no more items)
- `prev`: Cursor string for the previous page (null if at start)
- `page` / `pages`: Set to null when in cursor mode (signals cursor mode to clients)

When anchor mode is used, additional metadata:

```json
{
  "meta": {
    "pagination": { ... },
    "anchor": {
      "id": "65a8f3...",
      "found": true,
      "index": 12
    }
  }
}
```

### Keyset WHERE Clause Generation

For `created_at DESC, id DESC` with `after` cursor:

```sql
WHERE (created_at, id) < (:cursor_created_at, :cursor_id)
  AND parent_id IS NULL
  AND status NOT IN ('hidden', 'deleted')
ORDER BY created_at DESC, id DESC
LIMIT 20
```

For `count__likes DESC, created_at DESC, id DESC` ("Best" sort) with `after` cursor:

```sql
WHERE (count__likes < :cursor_count__likes)
   OR (count__likes = :cursor_count__likes AND created_at < :cursor_created_at)
   OR (count__likes = :cursor_count__likes AND created_at = :cursor_created_at AND id < :cursor_id)
ORDER BY count__likes DESC, created_at DESC, id DESC
LIMIT 20
```

MySQL supports tuple comparison `(a, b) < (x, y)` for simple cases, but the expanded OR form is needed when sort directions differ or computed columns (like `count__likes`) are involved.

### Anchor Resolution

When `anchor=<commentId>` is provided:

1. Determine the anchor comment's sort key values (e.g., its `created_at` and `id`)
2. Count how many items precede it in the current sort order
3. Fetch a window of items centered around the anchor: some before + some after
4. Return the items with cursors that allow paginating in both directions from that point
5. Include `meta.anchor.found: true/false` to let the client know if the anchor was located

For replies, the anchor could be a reply ID — load replies around that position in the parent thread.

---

## Implementation Plan

### Phase 1: Backend — Cursor Pagination Infrastructure

Core infrastructure in `ghost/core` that enables cursor-based pagination alongside the existing page-based system.

#### Task 1.1: Create cursor utility module
**File**: `ghost/core/core/server/services/comments/cursor-utils.js` (new)

- `encodeCursor(values: Record<string, any>): string` — base64 encode sort key values
- `decodeCursor(cursor: string): Record<string, any>` — decode and validate cursor
- `buildKeysetCondition(cursor: Record<string, any>, order: ParsedOrder[], direction: 'after'|'before'): KnexRawClause` — generate the `WHERE` clause for keyset pagination
- `parseOrder(orderString: string): ParsedOrder[]` — parse `"created_at DESC, id DESC"` into structured form
- `extractCursorValues(model: any, order: ParsedOrder[]): Record<string, any>` — extract sort key values from a model instance to create cursors
- Unit tests in `ghost/core/test/unit/server/services/comments/cursor-utils.test.js`

#### Task 1.2: Add `findPageByCursor()` to Comment model
**File**: `ghost/core/core/server/models/comment.js`

Add a new static method `findPageByCursor(options)` that:
1. Parses `after`/`before` cursor from options
2. Decodes cursor to get sort key values
3. Applies keyset WHERE clause via `applyCustomQuery` or a new query modifier
4. Runs the query with `LIMIT` (no `OFFSET`)
5. Extracts cursor values from first/last results for `prev`/`next` cursors
6. Runs a count query for `total` (optional, can be omitted for performance and populated lazily)
7. Returns `{ data, meta: { pagination: { limit, total, next, prev } } }`

This method handles computed columns (`count__likes`) by joining or subquerying as needed — reusing the existing `countRelations()` approach from the Comment model.

#### Task 1.3: Add anchor resolution to Comment model
**File**: `ghost/core/core/server/models/comment.js`

Add `findPageAroundAnchor(anchorId, options)` that:
1. Fetches the anchor comment to get its sort key values
2. Counts items before the anchor in the current sort order
3. Fetches items: `limit/2` before + `limit/2` after the anchor (adjusting if near boundaries)
4. Returns the standard cursor pagination response plus `meta.anchor` metadata
5. If anchor not found (deleted, hidden from current user), falls back to first page with `meta.anchor.found: false`

#### Task 1.4: Extend Comment model `permittedOptions`
**File**: `ghost/core/core/server/models/comment.js`

Add `'after'`, `'before'`, and `'anchor'` to the `permittedOptions` array so they pass through the options filtering.

### Phase 2: Backend — Comments API Endpoint Changes

Wire cursor pagination into the existing API endpoints for both the Members (public) and Admin APIs.

#### Task 2.1: Update Members API endpoint options
**File**: `ghost/core/core/server/api/endpoints/comments-members.js`

Add `'after'`, `'before'`, `'anchor'` to the `options` array for the `browse` and `replies` actions.

#### Task 2.2: Update Admin API endpoint options
**File**: `ghost/core/core/server/api/endpoints/comments.js` (admin)

Add `'after'`, `'before'`, `'anchor'` to the `options` array for `browse` and `browseAll` actions.

#### Task 2.3: Update comments controller to route cursor vs page
**File**: `ghost/core/core/server/services/comments/comments-controller.js`

In `browse()`, `adminBrowse()`, `adminBrowseAll()`, and `replies()`:
- If `frame.options.after`, `frame.options.before`, or `frame.options.anchor` is present, call the cursor-based methods
- Otherwise, fall through to existing page-based `findPage()` (backward compat)

#### Task 2.4: Update comments service
**File**: `ghost/core/core/server/services/comments/comments-service.js`

Add new methods:
- `getCommentsByCursor(options)` — calls `Comment.findPageByCursor()`
- `getCommentsAroundAnchor(anchorId, options)` — calls `Comment.findPageAroundAnchor()`
- `getRepliesByCursor(parentId, options)` — cursor-based reply fetching

#### Task 2.5: Update input serializers
**File**: `ghost/core/core/server/api/endpoints/utils/serializers/input/comments.js`

- Ensure `order` defaults still apply for cursor mode
- Append `id` as tiebreaker to the order string if not already present (critical for deterministic keyset ordering)
- When `after`/`before` is present, skip setting `page` defaults

#### Task 2.6: Update output serializer for cursor metadata
**File**: `ghost/core/core/server/api/endpoints/utils/serializers/output/` (comments mappers)

- When cursor pagination metadata is present in the response, serialize `next`/`prev` cursor strings instead of `page`/`pages`
- Include `anchor` metadata when present
- Maintain backward compatibility: page-based responses keep their existing shape

#### Task 2.7: E2E API tests
**Files**: `ghost/core/test/e2e-api/members-comments/` and `ghost/core/test/e2e-api/admin/`

- Test cursor-based browse with `after`/`before` params
- Test all three sort orders (newest, oldest, best) with cursors
- Test anchor resolution (found, not found, reply anchor)
- Test cursor stability when new comments are inserted between requests
- Test backward compatibility: existing page-based requests still work
- Test edge cases: empty results, single item, cursor for deleted comment

### Phase 3: Frontend — comments-ui Cursor Adoption

Migrate the `comments-ui` public app from page-based to cursor-based pagination.

#### Task 3.1: Update API client
**File**: `apps/comments-ui/src/utils/api.ts`

- `comments.browse()`: Replace `page` param with `after` cursor param. First request sends no cursor; subsequent requests send the `next` cursor from the previous response.
- Remove the `firstCommentCreatedAt` hack — cursor pagination inherently handles this consistency problem
- `comments.replies()`: Already pseudo-cursor-based via `id:>'${afterReplyId}'`. Migrate to use the new `after` cursor param for consistency.

#### Task 3.2: Update admin API client
**File**: `apps/comments-ui/src/utils/admin-api.ts`

Mirror the changes from Task 3.1 for the admin API proxy used when comments-ui is loaded in admin context.

#### Task 3.3: Update state types
**File**: `apps/comments-ui/src/app-context.ts`

- Update `Pagination` type: add optional `next: string | null`, `prev: string | null` cursor fields
- Keep `page`, `pages`, `total` as optional for backward compat during transition

#### Task 3.4: Update actions — `loadMoreComments`
**File**: `apps/comments-ui/src/actions.ts`

- `loadMoreComments`: Instead of incrementing `state.pagination.page`, pass `state.pagination.next` as the `after` cursor
- Detect "has more" via `state.pagination.next !== null` instead of `page < pages`
- Remove deduplication logic — cursor pagination guarantees no overlapping results (items only shift into already-fetched territory, never into the next page)

#### Task 3.5: Update actions — `setOrder`
**File**: `apps/comments-ui/src/actions.ts`

- `setOrder`: Reset cursor state (clear `next`/`prev`), fetch first page with no cursor
- No other changes needed — the API handles cursor generation for each sort order

#### Task 3.6: Update actions — `loadMoreReplies`
**File**: `apps/comments-ui/src/actions.ts`

- `loadMoreReplies`: Use `after` cursor from the reply pagination response instead of extracting the last reply ID manually
- Simplify the "load all" loop to follow `next` cursors until null

#### Task 3.7: Update pagination components
**File**: `apps/comments-ui/src/components/content/pagination.tsx`

- Update "Load More" button visibility: check `pagination.next !== null` instead of calculating remaining from `page * limit`
- Update remaining count display: use `total - loadedCount` or keep approximate

**File**: `apps/comments-ui/src/components/content/replies-pagination.tsx`
- Same pattern: use cursor presence instead of page math

#### Task 3.8: Improve anchor/permalink flow
**File**: `apps/comments-ui/src/app.tsx` (init logic) and `apps/comments-ui/src/actions.ts`

Current flow when navigating to `#ghost-comments-{id}`:
1. Verify comment exists (API read)
2. Iterate through pages until comment is found
3. Load all replies if it's a reply

New flow with anchor support:
1. Verify comment exists (API read) — unchanged
2. **Single API call**: `browse({ anchor: commentId })` — returns the page containing that comment, plus cursors for pagination in both directions
3. If it's a reply: `replies({ anchor: replyId, commentId: parentId })` — returns replies around that specific reply
4. Set both `next` and `prev` cursors so user can scroll in either direction from the anchor

This eliminates the page-iteration loop entirely.

#### Task 3.9: Update comments-ui tests
**Files**: `apps/comments-ui/test/`

- Update existing pagination tests to use cursor-based assertions
- Add tests for anchor-based loading
- Add tests for cursor stability during comment insertion

### Phase 4: Admin — Comment Moderation Cursor Adoption

Migrate the admin comment moderation view from page-based to cursor-based infinite queries.

#### Task 4.1: Update admin-x-framework comment hooks
**File**: `apps/admin-x-framework/src/api/comments.ts`

- `useBrowseComments` / `useBrowseCommentsQuery`: Update `defaultNextPageParams` to use `next` cursor from `meta.pagination` instead of incrementing `page`
- `useThreadComments`: Similarly use cursor-based pagination for reply threads
- Update `returnData` to handle cursor metadata shape

#### Task 4.2: Update `createInfiniteQuery` for cursor support
**File**: `apps/admin-x-framework/src/utils/api/hooks.ts`

- The `getNextPageParam` function needs to handle both cursor-based (`meta.pagination.next` as cursor string) and page-based responses
- Update to detect cursor mode: if `meta.pagination.next` is a string (not a number), treat it as a cursor and pass as `after` param
- This maintains backward compat for all non-comment infinite queries that still use page-based pagination

#### Task 4.3: Update virtual scroll integration
**File**: `apps/posts/src/components/virtual-table/use-infinite-virtual-scroll.tsx`

- The virtual scroll hook fetches next pages automatically. Verify it works with cursor-based pagination (it should — it only calls `fetchNextPage()` and checks `hasNextPage`)
- The `totalItems` estimate may need adjustment since cursor pagination may not always provide total counts

#### Task 4.4: Add admin anchor navigation
**Files**: `apps/posts/src/views/comments/comments.tsx`

- When navigating to a specific comment (e.g., from notification, `?id=is:commentId` filter), use anchor-based loading instead of filtering
- This shows the comment in context (surrounding comments visible) rather than isolated

#### Task 4.5: Update admin comments tests
**Files**: `apps/posts/test/` and `apps/admin-x-framework/test/`

- Update mocks to return cursor-based pagination metadata
- Test infinite scroll with cursors
- Test anchor navigation

### Phase 5: Cleanup & Documentation

#### Task 5.1: Remove legacy workarounds
- Remove `firstCommentCreatedAt` tracking from `apps/comments-ui/src/utils/api.ts`
- Remove deduplication logic from `loadMoreComments` action
- Clean up any page-specific logic that's no longer needed

#### Task 5.2: Add database index for cursor performance
**File**: New migration in `ghost/core/core/server/data/migrations/`

Add composite indexes to support efficient keyset queries:
- `comments(created_at DESC, id DESC)` — for "newest" sort
- `comments(created_at ASC, id ASC)` — for "oldest" sort (may be covered by the desc index depending on MySQL version)
- Note: The "best" sort (`count__likes`) is computed and cannot be directly indexed. It will still be fast for reasonable comment volumes since the WHERE clause narrows the result set.

Verify existing indexes on `comments(post_id)`, `comments(parent_id)`, `comments(status)` are adequate.

#### Task 5.3: API documentation
Update API documentation to describe the new cursor parameters and response format.

---

## Sort Order Considerations

### "Newest" (`created_at DESC, id DESC`)
Straightforward keyset on `(created_at, id)`. Most common case. Excellent cursor performance with index support.

### "Oldest" (`created_at ASC, id ASC`)
Same as newest but reversed direction. Uses `(created_at, id) > (cursor_created_at, cursor_id)`.

### "Best" (`count__likes DESC, created_at DESC, id DESC`)
This is the most complex case because `count__likes` is a computed column (subquery count). Two approaches:

**Option A: Materialize in WHERE clause** (recommended)
- Include the like count in the cursor
- Use the expanded OR-form WHERE clause
- The count subquery only runs for the WHERE comparison, not a full sort
- Acceptable for comment volumes (rarely millions per post)

**Option B: Denormalized like_count column**
- Add a `like_count` column to the `comments` table, maintained via triggers or application logic
- Enables direct indexing: `comments(like_count DESC, created_at DESC, id DESC)`
- Better performance but adds maintenance complexity
- Consider as a future optimization if "Best" sort cursor performance becomes an issue

Initial implementation will use Option A. If performance profiling reveals issues, Option B can be added as a follow-up.

---

## Migration & Backward Compatibility

- **API backward compat**: The `page` parameter continues to work. Cursor params are additive. Existing integrations that use `page`/`limit` are unaffected.
- **Response backward compat**: When page-based pagination is used, the response shape is unchanged. Cursor fields (`next`/`prev` as strings) only appear when cursor params are used.
- **Frontend rollout**: The comments-ui and admin apps will be updated in the same release. Since they're bundled with Ghost, there's no version mismatch concern.
- **Cache invalidation**: Cursor-based pagination respects the same `X-Cache-Invalidate` patterns. Cursor values themselves are not cached — they're opaque tokens that always resolve to fresh data.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Computed columns (count__likes) make keyset WHERE complex | Start with expanded OR-form; profile and optimize later if needed |
| MySQL tuple comparison edge cases | Use explicit expanded form rather than relying on MySQL tuple syntax |
| Cursor invalidation (referenced row deleted) | Treat invalid cursor as "start from beginning" with appropriate meta signal |
| Total count performance with cursors | Make total count optional/lazy — cursor UIs often don't need exact totals |
| Breaking existing API consumers | Cursor params are purely additive; page-based still works identically |

---

## File Change Summary

### New Files
- `ghost/core/core/server/services/comments/cursor-utils.js`
- `ghost/core/test/unit/server/services/comments/cursor-utils.test.js`
- Database migration for composite indexes

### Modified Files (Backend)
- `ghost/core/core/server/models/comment.js` — `findPageByCursor`, `findPageAroundAnchor`, `permittedOptions`
- `ghost/core/core/server/services/comments/comments-service.js` — new cursor/anchor methods
- `ghost/core/core/server/services/comments/comments-controller.js` — route cursor vs page
- `ghost/core/core/server/api/endpoints/comments-members.js` — add cursor options
- `ghost/core/core/server/api/endpoints/comments.js` (admin) — add cursor options
- `ghost/core/core/server/api/endpoints/utils/serializers/input/comments.js` — order tiebreaker, cursor handling
- `ghost/core/core/server/api/endpoints/utils/serializers/output/` — cursor metadata serialization
- E2E test files

### Modified Files (Frontend — comments-ui)
- `apps/comments-ui/src/utils/api.ts` — cursor params, remove firstCommentCreatedAt
- `apps/comments-ui/src/utils/admin-api.ts` — cursor params
- `apps/comments-ui/src/app-context.ts` — pagination types
- `apps/comments-ui/src/actions.ts` — cursor-based loadMore, anchor loading
- `apps/comments-ui/src/app.tsx` — anchor init flow
- `apps/comments-ui/src/components/content/pagination.tsx` — cursor-aware UI
- `apps/comments-ui/src/components/content/replies-pagination.tsx` — cursor-aware UI
- Test files

### Modified Files (Admin)
- `apps/admin-x-framework/src/api/comments.ts` — cursor-based hooks
- `apps/admin-x-framework/src/utils/api/hooks.ts` — cursor support in createInfiniteQuery
- `apps/posts/src/components/virtual-table/use-infinite-virtual-scroll.tsx` — verify cursor compat
- `apps/posts/src/views/comments/comments.tsx` — anchor navigation
- Test files
