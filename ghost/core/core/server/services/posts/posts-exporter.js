const nql = require('@tryghost/nql');
const logging = require('@tryghost/logging');
const {Readable, Transform} = require('stream');

class PostsExporter {
    #models;
    #getPostUrl;
    #settingsCache;
    #settingsHelpers;
    #knex;

    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.models
     * @param {Object} dependencies.models.Post
     * @param {Object} dependencies.models.Newsletter
     * @param {Object} dependencies.models.Label
     * @param {Object} dependencies.models.Product
     * @param {Object} dependencies.getPostUrl
     * @param {Object} dependencies.settingsCache
     * @param {Object} dependencies.settingsHelpers
     * @param {Object} dependencies.knex
     */
    constructor({models, getPostUrl, settingsCache, settingsHelpers, knex}) {
        this.#models = models;
        this.#getPostUrl = getPostUrl;
        this.#settingsCache = settingsCache;
        this.#settingsHelpers = settingsHelpers;
        this.#knex = knex;
    }

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
    async export({filter, order, limit}) {
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
            // Parse and validate order clauses to avoid raw SQL injection
            const allowedColumns = new Set(['id', 'title', 'status', 'visibility', 'featured', 'created_at', 'published_at', 'updated_at']);
            const clauses = order.split(',').map(c => c.trim()).filter(Boolean);
            for (const clause of clauses) {
                const [col, dir] = clause.split(/\s+/);
                if (allowedColumns.has(col)) {
                    postsQuery.orderBy(col, dir?.toLowerCase() === 'asc' ? 'asc' : 'desc');
                }
            }
        }

        if (limit && limit !== 'all') {
            postsQuery.limit(Number(limit));
        }

        // Batching transform — groups rows into arrays of batchSize
        const batchSize = 50;
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
                        // paid_conversions: uses members_subscription_created_events
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

                    const postMetaMap = new Map(postMetaRows.map(m => [m.post_id, m]));

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

                        // Attach posts_meta so getPostUrl can distinguish email-only posts
                        const meta = postMetaMap.get(row.id);
                        if (meta) {
                            row.posts_meta = {email_only: meta.email_only};
                        }

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
                            emailRecipients = self.humanReadableEmailRecipientFilter(email.recipient_filter, labels, tiers);
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
                            featured: !!row.featured,
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

    mapPostStatus(status, hasEmail) {
        if (status === 'draft') {
            return 'draft';
        }

        if (status === 'scheduled') {
            return 'scheduled';
        }

        if (status === 'sent') {
            return 'emailed only';
        }

        if (status === 'published') {
            if (hasEmail) {
                return 'published and emailed';
            }
            return 'published only';
        }
        return status;
    }

    /**
     * Convert an email filter to a human readable string
     * @param {string} recipientFilter
     * @param {Array<{slug: string, name: string}>} allLabels
     * @param {Array<{slug: string, name: string}>} allTiers
     * @returns {string}
     */
    humanReadableEmailRecipientFilter(recipientFilter, allLabels, allTiers) {
        if (recipientFilter === 'all') {
            return 'All subscribers';
        }

        try {
            const parsed = nql(recipientFilter).parse();
            const strings = this.filterToString(parsed, allLabels, allTiers);
            return strings.join(', ');
        } catch (e) {
            logging.error(e);
            return recipientFilter;
        }
    }

    /**
     * Convert an NQL filter to a human readable string
     * @param {*} filter Parsed NQL filter
     * @param {Array<{slug: string, name: string}>} allLabels
     * @param {Array<{slug: string, name: string}>} allTiers
     * @returns {string[]}
     */
    filterToString(filter, allLabels, allTiers) {
        const strings = [];
        if (filter.$and) {
            // Not supported
        } else if (filter.$or) {
            for (const subfilter of filter.$or) {
                strings.push(...this.filterToString(subfilter, allLabels, allTiers));
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
}

module.exports = PostsExporter;
