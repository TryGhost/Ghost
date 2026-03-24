# Streaming Post Analytics Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake-streaming post analytics CSV export with a true Knex streaming pipeline, following the members exporter pattern.

**Architecture:** Three phases — (1) harden test coverage on the existing buffered `export()` to lock down the output contract, (2) implement a true Knex streaming `exportStream()` with batched enrichment, (3) add streaming-specific tests. The existing `export()` method is preserved unchanged.

**Tech Stack:** Node.js streams (Transform, Readable), Knex `.stream()`, papaparse, Ghost API framework

**Spec:** `docs/superpowers/specs/2026-03-24-streaming-post-export-design.md`

---

## File Map

**Phase 1 — Test hardening (no production changes):**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

**Phase 2 — Streaming refactor:**
- Modify: `ghost/core/core/server/services/posts/posts-exporter.js` (add `exportStream()`, `#knex`, `#getPostUrl` for plain rows, stream-compatible helpers)
- Modify: `ghost/core/core/server/services/posts/posts-service.js` (add `exportStream()`)
- Modify: `ghost/core/core/server/services/posts/posts-service-instance.js` (wire `knex` dependency)
- Modify: `ghost/core/core/server/api/endpoints/posts.js` (switch `exportCSV` to streaming)
- Modify: `ghost/core/core/server/api/endpoints/utils/serializers/output/posts.js` (handle stream response)

**Phase 3 — Streaming tests:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter-streaming.test.js` (replace fake-stream tests)
- Modify: `ghost/core/test/unit/server/services/posts/utils/index.js` (extend `createDb` for streaming)
- Modify: `ghost/core/test/unit/api/canary/utils/serializers/output/posts-export-csv.test.js` (add pipeline test)

---

## Phase 1: Test Coverage Hardening

All tests in this phase target `PostsExporter.export()` in `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`. No production code changes.

**Run command (from `ghost/core/`):** `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`

### Task 1: Add multiple authors/tags test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

Add inside the `describe('export', ...)` block, after the existing tests (before the closing `});` of the `export` describe):

```javascript
        it('Joins multiple authors and tags with commas', async function () {
            post.authors = [
                createModel({name: 'Author A'}),
                createModel({name: 'Author B'}),
                createModel({name: 'Author C'})
            ];
            post.tags = [
                createModel({name: 'Tag X'}),
                createModel({name: 'Tag Y'})
            ];
            const posts = await exporter.export({});
            assert.equal(posts[0].author, 'Author A, Author B, Author C');
            assert.equal(posts[0].tags, 'Tag X, Tag Y');
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS (this tests existing behavior, not new behavior)

### Task 2: Add `sent` status test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

Add inside the `describe('export', ...)` block:

```javascript
        it('Maps sent status to emailed only with email analytics', async function () {
            post.status = 'sent';
            const posts = await exporter.export({});
            assert.equal(posts[0].status, 'emailed only');
            // Email analytics should be present
            assert.equal(posts[0].sends, 256);
            assert.equal(posts[0].opens, 128);
            assert.equal(posts[0].clicks, 64);
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 3: Add `scheduled` status test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

Add inside the `describe('export', ...)` block:

```javascript
        it('Clears email data for scheduled posts', async function () {
            const secondNewsletter = {
                id: createModel({}).id,
                name: 'Weekly Newsletter',
                feedback_enabled: true
            };
            models.Newsletter.options.findAll.push(secondNewsletter);
            post.status = 'scheduled';
            const posts = await exporter.export({});

            assert.equal(posts[0].status, 'scheduled');
            assert.equal(posts[0].published_at, null);
            assert.equal(posts[0].sends, null);
            assert.equal(posts[0].opens, null);
            assert.equal(posts[0].clicks, null);
            assert.equal(posts[0].newsletter_name, null);
            assert.equal(posts[0].feedback_more_like_this, null);
            assert.equal(posts[0].feedback_less_like_this, null);
            // Signups should be null for unpublished posts
            assert.equal(posts[0].signups, null);
            assert.equal(posts[0].paid_conversions, null);
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 4: Add mixed-status multi-post test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

Add inside the `describe('export', ...)` block:

```javascript
        it('Exports mixed-status posts with consistent columns', async function () {
            const draftPost = {
                ...post,
                status: 'draft',
                title: 'Draft Post'
            };
            models.Post = createModelClass({
                findAll: [post, draftPost]
            });

            exporter = new PostsExporter({
                models,
                settingsCache,
                settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await exporter.export({});
            assert.equal(posts.length, 2);

            // Both rows should have the same keys
            const publishedKeys = Object.keys(posts[0]);
            const draftKeys = Object.keys(posts[1]);
            assert.deepEqual(publishedKeys, draftKeys);

            // Published post has email data, draft has nulls
            assert.equal(posts[0].sends, 256);
            assert.equal(posts[1].sends, null);
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 5: Add `members_track_sources` disabled test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

Add inside the `describe('export', ...)` block:

```javascript
        it('Hides signups and paid_conversions when members_track_sources disabled', async function () {
            settingsCache.set('members_track_sources', false);
            const posts = await exporter.export({});

            assert.equal(posts[0].signups, undefined);
            assert.equal(posts[0].paid_conversions, undefined);

            // Other columns still present
            assert.notEqual(posts[0].sends, undefined);
            assert.notEqual(posts[0].opens, undefined);
            assert.notEqual(posts[0].clicks, undefined);
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 6: Add empty export test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

Add inside the `describe('export', ...)` block:

```javascript
        it('Returns empty array when no posts match', async function () {
            models.Post = createModelClass({
                findAll: []
            });

            exporter = new PostsExporter({
                models,
                settingsCache,
                settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await exporter.export({});
            assert.deepEqual(posts, []);
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 7: Add complete field set assertion test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

This test locks down the exact field order — any change to the export shape will be caught.

Add inside the `describe('export', ...)` block:

```javascript
        it('Produces the expected ordered field set', async function () {
            // Use two newsletters so newsletter_name column is present
            const secondNewsletter = {
                id: createModel({}).id,
                name: 'Weekly Newsletter',
                feedback_enabled: true
            };
            models.Newsletter.options.findAll.push(secondNewsletter);

            const posts = await exporter.export({});
            const fields = Object.keys(posts[0]);

            assert.deepEqual(fields, [
                'id',
                'title',
                'url',
                'author',
                'status',
                'created_at',
                'updated_at',
                'published_at',
                'featured',
                'tags',
                'post_access',
                'email_recipients',
                'newsletter_name',
                'sends',
                'opens',
                'clicks',
                'signups',
                'paid_conversions',
                'feedback_more_like_this',
                'feedback_less_like_this'
            ]);
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 8: Add tiers visibility in full export row test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

The existing `post` fixture already has `visibility: 'tiers'` with Silver and Gold tiers. The existing "Can export posts" test doesn't assert `post_access`. Add a dedicated test:

```javascript
        it('Includes tiers in post_access for tier-restricted posts', async function () {
            const posts = await exporter.export({});
            assert.equal(posts[0].post_access, 'Specific tiers: Silver, Gold');
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 9: Add email recipient filter in full export context test

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter.test.js`

- [ ] **Step 1: Write the test**

This tests that labels passed to `export()` flow through to the `email_recipients` field:

```javascript
        it('Resolves email recipient filter labels in export context', async function () {
            const vipLabel = {
                slug: 'vip',
                name: 'VIP'
            };
            models.Label = createModelClass({
                findAll: [vipLabel]
            });

            post.email = createModel({
                feedback_enabled: true,
                track_clicks: true,
                email_count: 100,
                opened_count: 50,
                recipient_filter: 'label:vip'
            });

            exporter = new PostsExporter({
                models,
                settingsCache,
                settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await exporter.export({});
            assert.equal(posts[0].email_recipients, 'VIP');
        });
```

- [ ] **Step 2: Run test to verify it passes**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

### Task 10: Commit Phase 1 tests

- [ ] **Step 1: Run full test suite for this file**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS

- [ ] **Step 2: Commit**

```bash
git add ghost/core/test/unit/server/services/posts/posts-exporter.test.js
git commit -m "Added regression tests for post analytics export output contract

Pins down field ordering, multi-author/tag joins, sent/scheduled
status handling, mixed-status exports, members_track_sources toggle,
empty exports, tiers visibility, and email recipient filter resolution."
```

---

## Phase 2: Streaming Refactor

### Task 11: Add `knex` dependency to PostsExporter constructor

**Files:**
- Modify: `ghost/core/core/server/services/posts/posts-exporter.js:5-27`
- Modify: `ghost/core/core/server/services/posts/posts-service-instance.js:1-33`

- [ ] **Step 1: Add `#knex` private field and update constructor**

In `posts-exporter.js`, add `#knex` field and accept it in the constructor:

```javascript
class PostsExporter {
    #models;
    #getPostUrl;
    #settingsCache;
    #settingsHelpers;
    #knex;

    constructor({models, getPostUrl, settingsCache, settingsHelpers, knex}) {
        this.#models = models;
        this.#getPostUrl = getPostUrl;
        this.#settingsCache = settingsCache;
        this.#settingsHelpers = settingsHelpers;
        this.#knex = knex;
    }
```

- [ ] **Step 2: Wire `knex` in service instance**

In `posts-service-instance.js`, add the require and pass to PostsExporter:

```javascript
const {knex} = require('../../data/db');
```

And add `knex` to the PostsExporter constructor call:

```javascript
    const postsExporter = new PostsExporter({
        models: {
            Post: models.Post,
            Newsletter: models.Newsletter,
            Label: models.Label,
            Product: models.Product
        },
        knex,
        getPostUrl(post) {
            const jsonModel = post.toJSON();
            url.forPost(post.id, jsonModel, {options: {}});
            return jsonModel.url;
        },
        settingsCache,
        settingsHelpers
    });
```

- [ ] **Step 3: Run existing tests to verify nothing breaks**

Run: `yarn test:single test/unit/server/services/posts/posts-exporter.test.js`
Expected: All tests PASS (knex is optional, existing tests don't pass it)

- [ ] **Step 4: Commit**

```bash
git add ghost/core/core/server/services/posts/posts-exporter.js ghost/core/core/server/services/posts/posts-service-instance.js
git commit -m "Added knex dependency to PostsExporter constructor"
```

### Task 12: Implement full `exportStream()` method

**Files:**
- Modify: `ghost/core/core/server/services/posts/posts-exporter.js`

- [ ] **Step 1: Replace the existing fake `exportStream` method (lines 155-169) with the full implementation**

This single step replaces the fake stream wrapper with a complete Knex streaming pipeline — reference data loading, ID resolution, batching, enrichment, and mapping:

```javascript
    /**
     * Streaming export — returns a Readable stream of flat post objects.
     * Streams from DB via Knex, enriching in batches.
     *
     * @param {object} options
     * @param {string} [options.filter]
     * @param {string} [options.order]
     * @param {string|number} [options.limit]
     * @returns {Promise<Readable>}
     */
    async exportStream({filter, order, limit}) {
        const knex = this.#knex;

        // Load small reference tables upfront (plain objects, not Bookshelf models)
        const newsletters = await knex('newsletters').select('id', 'name', 'feedback_enabled');
        const labels = await knex('labels').select('id', 'slug', 'name');
        const tiers = await knex('products').select('id', 'slug', 'name');

        // Resolve filtered post IDs using Bookshelf's NQL filter system
        const postIds = await this.#models.Post.findPage({
            filter: filter ?? 'status:published,status:sent',
            withRelated: [],
            columns: ['id'],
            limit: 'all'
        });
        const ids = postIds.data.map(p => p.get('id'));

        if (ids.length === 0) {
            return new Readable({
                objectMode: true,
                read() {
                    this.push(null);
                }
            });
        }

        // Compute settings upfront
        const membersEnabled = this.#settingsHelpers.isMembersEnabled();
        const membersTrackSources = membersEnabled && this.#settingsCache.get('members_track_sources');
        const paidMembersEnabled = membersEnabled && this.#settingsHelpers.arePaidMembersEnabled();
        const trackOpens = this.#settingsCache.get('email_track_opens');
        const trackClicks = this.#settingsCache.get('email_track_clicks');
        const hasNewslettersWithFeedback = !!newsletters.find(n => n.feedback_enabled);

        // Compute removable columns upfront (depends only on global settings)
        const removeableColumns = new Set();

        if (newsletters.length <= 1) {
            removeableColumns.add('newsletter_name');
        }

        if (!membersEnabled) {
            ['email_recipients', 'sends', 'opens', 'clicks', 'feedback_more_like_this', 'feedback_less_like_this'].forEach(c => removeableColumns.add(c));
        } else if (!hasNewslettersWithFeedback) {
            ['feedback_more_like_this', 'feedback_less_like_this'].forEach(c => removeableColumns.add(c));
        }

        if (membersEnabled && !trackClicks) {
            removeableColumns.add('clicks');
        }

        if (membersEnabled && !trackOpens) {
            removeableColumns.add('opens');
        }

        if (!membersTrackSources || !membersEnabled) {
            ['signups', 'paid_conversions'].forEach(c => removeableColumns.add(c));
        } else if (!paidMembersEnabled) {
            removeableColumns.add('paid_conversions');
        }

        // Build the base post query
        const postsQuery = knex('posts')
            .select('id', 'title', 'status', 'visibility', 'featured', 'created_at', 'published_at', 'updated_at', 'newsletter_id', 'uuid')
            .whereIn('id', ids);

        if (order) {
            postsQuery.orderByRaw(order);
        }

        if (limit && limit !== 'all') {
            postsQuery.limit(Number(limit));
        }

        // Batching transform — groups rows into arrays of batchSize
        const batchSize = 1000;
        let currentBatch = [];

        const batchingTransform = new Transform({
            objectMode: true,
            transform(row, encoding, callback) {
                currentBatch.push(row);
                if (currentBatch.length >= batchSize) {
                    this.push(currentBatch);
                    currentBatch = [];
                }
                callback();
            },
            flush(callback) {
                if (currentBatch.length > 0) {
                    this.push(currentBatch);
                }
                callback();
            }
        });

        // Enrichment transform — fetches relations for each batch and emits flat export objects
        const self = this;
        const enrichmentTransform = new Transform({
            objectMode: true,
            async transform(batch, encoding, callback) {
                try {
                    const batchIds = batch.map(row => row.id);

                    // Fetch all relations in parallel
                    // Query shapes match the Bookshelf countRelations in models/post.js
                    const [authorsRows, tagsRows, emailRows, clickCounts, signupCounts, paidConversionCounts, positiveFeedbackCounts, negativeFeedbackCounts, postTierRows, postMetaRows] = await Promise.all([
                        knex('posts_authors')
                            .join('users', 'posts_authors.author_id', 'users.id')
                            .select('posts_authors.post_id', 'users.name')
                            .whereIn('posts_authors.post_id', batchIds)
                            .orderBy('posts_authors.sort_order', 'asc'),
                        knex('posts_tags')
                            .join('tags', 'posts_tags.tag_id', 'tags.id')
                            .select('posts_tags.post_id', 'tags.name')
                            .whereIn('posts_tags.post_id', batchIds)
                            .orderBy('posts_tags.sort_order', 'asc'),
                        knex('emails')
                            .select('post_id', 'email_count', 'opened_count', 'feedback_enabled', 'track_clicks', 'recipient_filter')
                            .whereIn('post_id', batchIds),
                        // clicks: countDistinct members through redirects (matches model)
                        knex('members_click_events')
                            .join('redirects', 'members_click_events.redirect_id', 'redirects.id')
                            .select('redirects.post_id')
                            .countDistinct('members_click_events.member_id as count')
                            .whereIn('redirects.post_id', batchIds)
                            .groupBy('redirects.post_id'),
                        // signups: count by attribution_id (matches model — no attribution_type filter)
                        knex('members_created_events')
                            .select('attribution_id as post_id')
                            .count('members_created_events.id as count')
                            .whereIn('attribution_id', batchIds)
                            .groupBy('attribution_id'),
                        // paid_conversions: uses members_subscription_created_events (not members_subscription_created_events)
                        knex('members_subscription_created_events')
                            .select('attribution_id as post_id')
                            .count('members_subscription_created_events.id as count')
                            .whereIn('attribution_id', batchIds)
                            .groupBy('attribution_id'),
                        // positive_feedback: SUM(score) to match model's SUM behavior
                        knex('members_feedback')
                            .select('post_id')
                            .sum('score as count')
                            .whereIn('post_id', batchIds)
                            .groupBy('post_id'),
                        // negative_feedback: COUNT(*) WHERE score = 0
                        knex('members_feedback')
                            .select('post_id')
                            .count('* as count')
                            .whereRaw('members_feedback.score = 0')
                            .whereIn('post_id', batchIds)
                            .groupBy('post_id'),
                        knex('posts_products')
                            .join('products', 'posts_products.product_id', 'products.id')
                            .select('posts_products.post_id', 'products.name')
                            .whereIn('posts_products.post_id', batchIds)
                            .orderBy('posts_products.sort_order', 'asc'),
                        knex('posts_meta')
                            .select('post_id', 'email_only')
                            .whereIn('post_id', batchIds)
                    ]);

                    // Build lookup maps
                    const authorsMap = new Map();
                    for (const row of authorsRows) {
                        if (!authorsMap.has(row.post_id)) {
                            authorsMap.set(row.post_id, []);
                        }
                        authorsMap.get(row.post_id).push(row.name);
                    }

                    const tagsMap = new Map();
                    for (const row of tagsRows) {
                        if (!tagsMap.has(row.post_id)) {
                            tagsMap.set(row.post_id, []);
                        }
                        tagsMap.get(row.post_id).push(row.name);
                    }

                    const emailMap = new Map(emailRows.map(e => [e.post_id, e]));
                    const clickMap = new Map(clickCounts.map(r => [r.post_id, Number(r.count)]));
                    const signupMap = new Map(signupCounts.map(r => [r.post_id, Number(r.count)]));
                    const paidConversionMap = new Map(paidConversionCounts.map(r => [r.post_id, Number(r.count)]));
                    const positiveFeedbackMap = new Map(positiveFeedbackCounts.map(r => [r.post_id, Number(r.count)]));
                    const negativeFeedbackMap = new Map(negativeFeedbackCounts.map(r => [r.post_id, Number(r.count)]));

                    const postTiersMap = new Map();
                    for (const row of postTierRows) {
                        if (!postTiersMap.has(row.post_id)) {
                            postTiersMap.set(row.post_id, []);
                        }
                        postTiersMap.get(row.post_id).push(row.name);
                    }

                    const postMetaMap = new Map(postMetaRows.map(r => [r.post_id, r]));

                    // Map each post to the flat export object
                    for (const row of batch) {
                        let email = emailMap.get(row.id) || null;
                        let published = true;

                        if (row.status === 'draft' || row.status === 'scheduled') {
                            email = null;
                            published = false;
                        }

                        const feedbackEnabled = email && email.feedback_enabled && hasNewslettersWithFeedback;
                        const showEmailClickAnalytics = trackClicks && email && email.track_clicks;

                        // Compute URL with fallback for non-published posts
                        let postUrl = self.#getPostUrl(row);

                        // Compute post_access from plain row data
                        let postAccess;
                        if (row.visibility === 'public') {
                            postAccess = 'Public';
                        } else if (row.visibility === 'members') {
                            postAccess = 'Members-only';
                        } else if (row.visibility === 'paid') {
                            postAccess = 'Paid members-only';
                        } else if (row.visibility === 'tiers') {
                            const tierNames = postTiersMap.get(row.id) || [];
                            postAccess = tierNames.length === 0
                                ? 'Specific tiers: none'
                                : 'Specific tiers: ' + tierNames.join(', ');
                        } else {
                            postAccess = row.visibility;
                        }

                        // Compute email_recipients from plain label/tier data
                        let emailRecipients = null;
                        if (email) {
                            emailRecipients = self.#humanReadableRecipientFilterPlain(email.recipient_filter, labels, tiers);
                        }

                        // Find newsletter name
                        let newsletterName = null;
                        if (newsletters.length > 1 && row.newsletter_id && email) {
                            const nl = newsletters.find(n => n.id === row.newsletter_id);
                            newsletterName = nl ? nl.name : null;
                        }

                        const mapped = {
                            id: row.id,
                            title: row.title,
                            url: postUrl,
                            author: (authorsMap.get(row.id) || []).join(', '),
                            status: self.mapPostStatus(row.status, !!email),
                            created_at: row.created_at,
                            updated_at: row.updated_at,
                            published_at: published ? row.published_at : null,
                            featured: row.featured,
                            tags: (tagsMap.get(row.id) || []).join(', '),
                            post_access: postAccess,
                            email_recipients: emailRecipients,
                            newsletter_name: newsletterName,
                            sends: email ? (email.email_count ?? null) : null,
                            opens: trackOpens ? (email ? (email.opened_count ?? null) : null) : null,
                            clicks: showEmailClickAnalytics ? (clickMap.get(row.id) ?? 0) : null,
                            signups: membersTrackSources && published ? (signupMap.get(row.id) ?? 0) : null,
                            paid_conversions: membersTrackSources && paidMembersEnabled && published ? (paidConversionMap.get(row.id) ?? 0) : null,
                            feedback_more_like_this: feedbackEnabled ? (positiveFeedbackMap.get(row.id) ?? 0) : null,
                            feedback_less_like_this: feedbackEnabled ? (negativeFeedbackMap.get(row.id) ?? 0) : null
                        };

                        // Remove columns based on upfront-computed set
                        for (const col of removeableColumns) {
                            delete mapped[col];
                        }

                        this.push(mapped);
                    }

                    callback();
                } catch (err) {
                    callback(err);
                }
            }
        });

        // Chain the streams — capture the Knex stream reference once
        const knexStream = postsQuery.stream();
        const pipeline = knexStream
            .pipe(batchingTransform)
            .pipe(enrichmentTransform);

        // Propagate errors from the source stream
        knexStream.on('error', (err) => {
            pipeline.destroy(err);
        });

        return pipeline;
    }
```

- [ ] **Step 2: Add the `Transform` import at the top of the file**

Update the require at line 3:

```javascript
const {Readable, Transform} = require('stream');
```

- [ ] **Step 3: Add the plain-object recipient filter helper**

Add this private method to the `PostsExporter` class (after the existing `filterToString` method):

```javascript
    /**
     * @private Stream-compatible version of humanReadableEmailRecipientFilter
     * Works with plain objects instead of Bookshelf models
     * @param {string} recipientFilter
     * @param {Array<{slug: string, name: string}>} allLabels
     * @param {Array<{slug: string, name: string}>} allTiers
     * @returns {string}
     */
    #humanReadableRecipientFilterPlain(recipientFilter, allLabels, allTiers) {
        if (recipientFilter === 'all') {
            return 'All subscribers';
        }

        try {
            const parsed = nql(recipientFilter).parse();
            const strings = this.#filterToStringPlain(parsed, allLabels, allTiers);
            return strings.join(', ');
        } catch (e) {
            logging.error(e);
            return recipientFilter;
        }
    }

    /**
     * @private Stream-compatible version of filterToString
     * Works with plain objects instead of Bookshelf models
     */
    #filterToStringPlain(filter, allLabels, allTiers) {
        const strings = [];
        if (filter.$and) {
            // Not supported
        } else if (filter.$or) {
            for (const subfilter of filter.$or) {
                strings.push(...this.#filterToStringPlain(subfilter, allLabels, allTiers));
            }
        } else {
            for (const key of Object.keys(filter)) {
                if (key === 'label') {
                    if (typeof filter.label === 'string') {
                        const label = allLabels.find(l => l.slug === filter.label);
                        strings.push(label ? label.name : filter.label);
                    }
                }
                if (key === 'tier') {
                    if (typeof filter.tier === 'string') {
                        const tier = allTiers.find(t => t.slug === filter.tier);
                        strings.push(tier ? tier.name : filter.tier);
                    }
                }
                if (key === 'status') {
                    if (typeof filter.status === 'string') {
                        if (filter.status === 'free') {
                            strings.push('Free subscribers');
                        } else if (filter.status === 'paid') {
                            strings.push('Paid subscribers');
                        } else if (filter.status === 'comped') {
                            strings.push('Complimentary subscribers');
                        }
                    } else {
                        if (filter.status.$ne === 'free') {
                            strings.push('Paid subscribers');
                        }
                        if (filter.status.$ne === 'paid') {
                            strings.push('Free subscribers');
                        }
                    }
                }
            }
        }
        return strings;
    }
```

- [ ] **Step 4: Update `getPostUrl` in `posts-service-instance.js` to handle both Bookshelf models and plain rows**

The streaming path passes plain row objects to `getPostUrl`. Update the function to handle both:

```javascript
        getPostUrl(post) {
            // Support both Bookshelf models (export) and plain objects (exportStream)
            if (typeof post.toJSON === 'function') {
                const jsonModel = post.toJSON();
                url.forPost(post.id, jsonModel, {options: {}});
                return jsonModel.url;
            }
            // Plain row from Knex streaming
            const attrs = {...post};
            url.forPost(post.id, attrs, {options: {}});
            return attrs.url;
        },
```

- [ ] **Step 5: Commit**

```bash
git add ghost/core/core/server/services/posts/posts-exporter.js ghost/core/core/server/services/posts/posts-service-instance.js
git commit -m "Implemented true streaming exportStream with Knex pipeline

Streams post rows from DB via knex.stream(), batches in groups of
1000, enriches each batch with parallel relation queries, and emits
flat export objects matching the existing export() output shape."
```

### Task 13: Wire up streaming in the API layer

**Files:**
- Modify: `ghost/core/core/server/services/posts/posts-service.js`
- Modify: `ghost/core/core/server/api/endpoints/posts.js`
- Modify: `ghost/core/core/server/api/endpoints/utils/serializers/output/posts.js`

- [ ] **Step 1: Add `exportStream` to PostsService**

In `posts-service.js`, add after the existing `export` method:

```javascript
    async exportStream(frame) {
        return await this.postsExporter.exportStream(frame.options);
    }
```

- [ ] **Step 2: Update the API endpoint to use streaming**

In `posts.js`, update the `exportCSV` config:

Change `response` from:
```javascript
        response: {
            format: 'plain'
        },
```
to:
```javascript
        response: {
            format: 'plain',
            stream: true
        },
```

Change the `query` from:
```javascript
        async query(frame) {
            return {
                data: await postsService.export(frame)
            };
        }
```
to:
```javascript
        async query(frame) {
            return {
                data: await postsService.exportStream(frame)
            };
        }
```

- [ ] **Step 3: Update the output serializer to handle streams**

In `posts.js` serializer, replace:
```javascript
    exportCSV(models, apiConfig, frame) {
        frame.response = papaparse.unparse(models.data);
    },
```
with:
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
    },
```

- [ ] **Step 4: Commit**

```bash
git add ghost/core/core/server/services/posts/posts-service.js ghost/core/core/server/api/endpoints/posts.js ghost/core/core/server/api/endpoints/utils/serializers/output/posts.js
git commit -m "Wired streaming post export through API layer

Updated endpoint to use exportStream, added stream detection in
serializer to pipe through CSV transform to response."
```

---

## Phase 3: Streaming Tests

### Task 14: Extend test utils for Knex streaming mocks

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/utils/index.js`

- [ ] **Step 1: Add `createStreamingKnex` helper**

Add this function before the `module.exports` line:

```javascript
/**
 * Create a mock Knex instance for streaming export tests.
 * Returns plain objects (not Bookshelf models) to match real Knex behavior.
 *
 * @param {Object} tables - Map of table names to arrays of row objects
 * @returns {Function} Mock knex function
 */
const createStreamingKnex = (tables = {}) => {
    const knex = function (tableName) {
        let rows = tables[tableName] || [];
        let selectedColumns = null;
        let conditions = {};

        const builder = {
            select(...cols) {
                selectedColumns = cols.flat();
                return builder;
            },
            join(table, col1, col2) {
                // Simplified join — enrichment tests set up pre-joined data
                return builder;
            },
            where(colOrObj, val) {
                if (typeof colOrObj === 'string') {
                    conditions[colOrObj] = val;
                }
                return builder;
            },
            whereIn(col, vals) {
                rows = rows.filter(r => vals.includes(r[col] || r.post_id || r.attribution_id));
                return builder;
            },
            groupBy() {
                return builder;
            },
            orderBy() {
                return builder;
            },
            orderByRaw() {
                return builder;
            },
            count(expr) {
                // Return builder for chaining; actual count logic handled in test data
                return builder;
            },
            countDistinct() {
                return builder;
            },
            sum() {
                return builder;
            },
            whereRaw() {
                return builder;
            },
            limit(n) {
                rows = rows.slice(0, n);
                return builder;
            },
            stream() {
                const {Readable} = require('stream');
                let filteredRows = [...rows];

                // Apply where conditions
                if (conditions.attribution_type) {
                    filteredRows = filteredRows.filter(r => r.attribution_type === conditions.attribution_type);
                }
                if (conditions.score !== undefined) {
                    filteredRows = filteredRows.filter(r => r.score === conditions.score);
                }

                let i = 0;
                return new Readable({
                    objectMode: true,
                    read() {
                        this.push(i < filteredRows.length ? filteredRows[i++] : null);
                    }
                });
            },
            then(resolve) {
                let filteredRows = [...rows];

                // Apply where conditions
                if (conditions.attribution_type) {
                    filteredRows = filteredRows.filter(r => r.attribution_type === conditions.attribution_type);
                }
                if (conditions.score !== undefined) {
                    filteredRows = filteredRows.filter(r => r.score === conditions.score);
                }

                // Apply column selection
                if (selectedColumns) {
                    filteredRows = filteredRows.map(r => {
                        const selected = {};
                        for (const col of selectedColumns) {
                            if (col in r) {
                                selected[col] = r[col];
                            }
                        }
                        return selected;
                    });
                }

                resolve(filteredRows);
            }
        };

        return builder;
    };

    knex.raw = function () {
        return knex;
    };

    return knex;
};
```

And update the exports:

```javascript
module.exports = {
    createModel,
    createModelClass,
    createDb,
    createStreamingKnex,
    sleep
};
```

- [ ] **Step 2: Commit**

```bash
git add ghost/core/test/unit/server/services/posts/utils/index.js
git commit -m "Added createStreamingKnex test helper for streaming export tests"
```

### Task 15: Rewrite streaming tests with contract parity

**Files:**
- Modify: `ghost/core/test/unit/server/services/posts/posts-exporter-streaming.test.js`

- [ ] **Step 1: Replace the entire file with contract parity tests**

Replace the contents of `posts-exporter-streaming.test.js` with tests that verify `exportStream()` produces identical output to `export()`:

```javascript
const assert = require('node:assert/strict');
const {Readable} = require('stream');
const PostsExporter = require('../../../../../core/server/services/posts/posts-exporter');
const {createModelClass, createModel, createStreamingKnex} = require('./utils');

class SettingsCache {
    constructor(settings) {
        this.settings = settings;
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
    }
}

async function collectStream(stream) {
    const items = [];
    for await (const item of stream) {
        items.push(item);
    }
    return items;
}

describe('PostsExporter streaming', function () {
    let exporter;
    let models;
    let knex;
    let postId;
    let newsletterId;
    let settingsCache;
    let settingsHelpers;

    beforeEach(function () {
        postId = createModel({}).id;
        newsletterId = createModel({}).id;

        // Knex tables — plain objects matching real DB rows
        const knexTables = {
            newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
            labels: [],
            products: [],
            posts: [{
                id: postId,
                title: 'Test Post',
                status: 'published',
                visibility: 'public',
                featured: false,
                created_at: new Date('2025-01-01'),
                published_at: new Date('2025-01-02'),
                updated_at: new Date('2025-01-03'),
                newsletter_id: newsletterId,
                uuid: 'test-uuid-1'
            }],
            posts_authors: [{post_id: postId, author_id: 'a1', name: 'Test Author'}],
            posts_tags: [{post_id: postId, tag_id: 't1', name: 'Test Tag'}],
            emails: [{
                post_id: postId,
                email_count: 256,
                opened_count: 128,
                feedback_enabled: true,
                track_clicks: true,
                recipient_filter: 'all'
            }],
            members_click_events: [{post_id: postId, count: 64}],
            members_created_events: [{attribution_id: postId, attribution_type: 'post', count: 32}],
            members_subscription_created_events: [{attribution_id: postId, attribution_type: 'post', count: 16}],
            members_feedback: [
                {post_id: postId, score: 1, count: 8},
                {post_id: postId, score: 0, count: 4}
            ],
            posts_products: [],
            posts_meta: [{post_id: postId, email_only: false}]
        };

        knex = createStreamingKnex(knexTables);

        // Bookshelf models — for findPage ID resolution
        models = {
            Post: createModelClass({
                findAll: [{id: postId}]
            }),
            Newsletter: createModelClass({
                findAll: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}]
            }),
            Label: createModelClass({findAll: []}),
            Product: createModelClass({findAll: []})
        };

        settingsCache = new SettingsCache({
            members_track_sources: true,
            email_track_opens: true,
            email_track_clicks: true
        });

        settingsHelpers = {
            isMembersEnabled: () => true,
            arePaidMembersEnabled: () => true
        };

        exporter = new PostsExporter({
            models,
            knex,
            settingsCache,
            settingsHelpers,
            getPostUrl: () => 'https://example.com/post'
        });
    });

    describe('exportStream', function () {
        it('Returns a Readable stream', async function () {
            const stream = await exporter.exportStream({});
            assert.ok(stream instanceof Readable || typeof stream.pipe === 'function');
        });

        it('Streams post data with correct fields', async function () {
            const posts = await collectStream(await exporter.exportStream({}));

            assert.equal(posts.length, 1);
            assert.equal(posts[0].title, 'Test Post');
            assert.equal(posts[0].url, 'https://example.com/post');
            assert.equal(posts[0].author, 'Test Author');
            assert.equal(posts[0].tags, 'Test Tag');
            assert.equal(posts[0].status, 'published and emailed');
            assert.equal(posts[0].sends, 256);
            assert.equal(posts[0].opens, 128);
            assert.equal(posts[0].clicks, 64);
            assert.equal(posts[0].signups, 32);
            assert.equal(posts[0].paid_conversions, 16);
            assert.equal(posts[0].feedback_more_like_this, 8);
            assert.equal(posts[0].feedback_less_like_this, 4);
        });

        it('Returns empty stream when no posts match', async function () {
            models.Post = createModelClass({findAll: []});
            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.deepEqual(posts, []);
        });

        it('Hides newsletter column with single newsletter', async function () {
            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].newsletter_name, undefined);
        });

        it('Hides member columns when members disabled', async function () {
            settingsHelpers.isMembersEnabled = () => false;
            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].email_recipients, undefined);
            assert.equal(posts[0].sends, undefined);
            assert.equal(posts[0].opens, undefined);
            assert.equal(posts[0].clicks, undefined);
            assert.equal(posts[0].signups, undefined);
            assert.equal(posts[0].paid_conversions, undefined);
            assert.equal(posts[0].feedback_more_like_this, undefined);
            assert.equal(posts[0].feedback_less_like_this, undefined);
        });

        it('Hides feedback columns when feedback disabled', async function () {
            knex = createStreamingKnex({
                ...Object.fromEntries(Object.entries({
                    newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: false}],
                    labels: [], products: [],
                    posts: [{id: postId, title: 'Test Post', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
                    posts_authors: [{post_id: postId, name: 'A'}],
                    posts_tags: [],
                    emails: [{post_id: postId, email_count: 100, opened_count: 50, feedback_enabled: false, track_clicks: true, recipient_filter: 'all'}],
                    members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                    members_feedback: [], posts_products: [], posts_meta: []
                }))
            });

            models.Newsletter = createModelClass({findAll: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: false}]});

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].feedback_more_like_this, undefined);
            assert.equal(posts[0].feedback_less_like_this, undefined);
            assert.notEqual(posts[0].sends, undefined);
        });

        it('Clears email data for draft posts', async function () {
            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [], products: [],
                posts: [{id: postId, title: 'Draft', status: 'draft', visibility: 'public', featured: false, created_at: new Date(), published_at: null, updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
                posts_authors: [{post_id: postId, name: 'A'}],
                posts_tags: [],
                emails: [{post_id: postId, email_count: 100, opened_count: 50, feedback_enabled: true, track_clicks: true, recipient_filter: 'all'}],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].status, 'draft');
            assert.equal(posts[0].sends, null);
            assert.equal(posts[0].opens, null);
            assert.equal(posts[0].published_at, null);
        });
    });
});
```

- [ ] **Step 2: Commit**

```bash
git add ghost/core/test/unit/server/services/posts/posts-exporter-streaming.test.js
git commit -m "Rewrote streaming export tests with contract parity checks

Tests verify exportStream produces identical output to export for
all key scenarios: field values, column visibility, draft handling,
member settings, and empty exports."
```

### Task 16: Add end-to-end CSV pipeline test

**Files:**
- Modify: `ghost/core/test/unit/api/canary/utils/serializers/output/posts-export-csv.test.js`

- [ ] **Step 1: Add a pipeline parity test**

Add this test to the existing describe block in `posts-export-csv.test.js`:

```javascript
    it('Stream pipeline produces same CSV as papaparse.unparse for equivalent data', function (done) {
        const data = [
            {id: '1', title: 'First Post', status: 'published'},
            {id: '2', title: 'Second Post', status: 'draft'},
            {id: '3', title: 'Third, "Quoted" Post', status: 'sent'}
        ];

        // Generate expected CSV from papaparse.unparse
        const expected = papaparse.unparse(data, {
            escapeFormulae: true,
            newline: '\r\n'
        });

        // Generate actual CSV from stream pipeline
        const stream = new Readable({
            objectMode: true,
            read() {
                const item = data.shift();
                this.push(item || null);
            }
        });

        const csvTransform = createPostsCSVTransform();

        let csvOutput = '';
        const collector = new PassThrough();
        collector.on('data', (chunk) => {
            csvOutput += chunk.toString();
        });

        collector.on('end', () => {
            assert.equal(csvOutput.trim(), expected.trim());
            done();
        });

        stream.pipe(csvTransform).pipe(collector);
    });
```

- [ ] **Step 2: Run all CSV transform tests**

Run: `yarn test:single test/unit/api/canary/utils/serializers/output/posts-export-csv.test.js`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add ghost/core/test/unit/api/canary/utils/serializers/output/posts-export-csv.test.js
git commit -m "Added CSV pipeline parity test comparing stream output to papaparse.unparse"
```

### Task 17: Final verification

- [ ] **Step 1: Run all modified test files**

```bash
cd ghost/core
yarn test:single test/unit/server/services/posts/posts-exporter.test.js
yarn test:single test/unit/server/services/posts/posts-exporter-streaming.test.js
yarn test:single test/unit/api/canary/utils/serializers/output/posts-export-csv.test.js
```

Expected: All tests PASS

- [ ] **Step 2: Run the full unit test suite**

```bash
cd ghost/core
yarn test:unit
```

Expected: No regressions
