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
                {post_id: postId, score: 0, count: 4},
                {post_id: postId, score: 1, count: 8}
            ],
            posts_products: [],
            posts_meta: [{post_id: postId, email_only: false}]
        };

        knex = createStreamingKnex(knexTables);

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

    describe('export', function () {
        it('Returns a Readable stream', async function () {
            const stream = await exporter.export({});
            assert.ok(stream instanceof Readable || typeof stream.pipe === 'function');
        });

        it('Streams post data with correct fields', async function () {
            const posts = await collectStream(await exporter.export({}));

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

            const posts = await collectStream(await exporter.export({}));
            assert.deepEqual(posts, []);
        });

        it('Hides newsletter column with single newsletter', async function () {
            const posts = await collectStream(await exporter.export({}));
            assert.equal(posts[0].newsletter_name, undefined);
        });

        it('Hides member columns when members disabled', async function () {
            settingsHelpers.isMembersEnabled = () => false;
            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.export({}));
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
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: false}],
                labels: [], products: [],
                posts: [{id: postId, title: 'Test Post', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
                posts_authors: [{post_id: postId, name: 'A'}],
                posts_tags: [],
                emails: [{post_id: postId, email_count: 100, opened_count: 50, feedback_enabled: false, track_clicks: true, recipient_filter: 'all'}],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            models.Newsletter = createModelClass({findAll: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: false}]});

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.export({}));
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

            const posts = await collectStream(await exporter.export({}));
            assert.equal(posts[0].status, 'draft');
            assert.equal(posts[0].sends, null);
            assert.equal(posts[0].opens, null);
            assert.equal(posts[0].published_at, null);
        });

        it('Exports posts without an email as published only', async function () {
            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [], products: [],
                posts: [{id: postId, title: 'Test Post', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: null, uuid: 'u1'}],
                posts_authors: [{post_id: postId, name: 'A'}],
                posts_tags: [],
                emails: [],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].status, 'published only');
        });

        it('Shows newsletter names with multiple newsletters', async function () {
            const secondNewsletterId = createModel({}).id;
            const secondPostId = createModel({}).id;

            models.Post = createModelClass({
                findAll: [{id: postId}, {id: secondPostId}]
            });

            knex = createStreamingKnex({
                newsletters: [
                    {id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true},
                    {id: secondNewsletterId, name: 'Weekly Newsletter', feedback_enabled: true}
                ],
                labels: [], products: [],
                posts: [
                    {id: postId, title: 'Post 1', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'},
                    {id: secondPostId, title: 'Post 2', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: secondNewsletterId, uuid: 'u2'}
                ],
                posts_authors: [{post_id: postId, name: 'A'}, {post_id: secondPostId, name: 'A'}],
                posts_tags: [],
                emails: [
                    {post_id: postId, email_count: 100, opened_count: 50, feedback_enabled: true, track_clicks: true, recipient_filter: 'all'},
                    {post_id: secondPostId, email_count: 100, opened_count: 50, feedback_enabled: true, track_clicks: true, recipient_filter: 'all'}
                ],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].newsletter_name, 'Daily Newsletter');
            assert.equal(posts[1].newsletter_name, 'Weekly Newsletter');
        });

        it('Hides clicks when click tracking disabled', async function () {
            settingsCache.set('email_track_clicks', false);
            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].clicks, undefined);
            assert.notEqual(posts[0].sends, undefined);
            assert.notEqual(posts[0].opens, undefined);
        });

        it('Hides opens when open tracking disabled', async function () {
            settingsCache.set('email_track_opens', false);
            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].opens, undefined);
            assert.notEqual(posts[0].sends, undefined);
            assert.notEqual(posts[0].clicks, undefined);
        });

        it('Hides paid_conversions when paid members disabled', async function () {
            settingsHelpers.arePaidMembersEnabled = () => false;
            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].paid_conversions, undefined);
            assert.notEqual(posts[0].signups, undefined);
            assert.notEqual(posts[0].sends, undefined);
        });

        it('Hides signups and paid_conversions when members_track_sources disabled', async function () {
            settingsCache.set('members_track_sources', false);
            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].signups, undefined);
            assert.equal(posts[0].paid_conversions, undefined);
            assert.notEqual(posts[0].sends, undefined);
        });

        it('Defaults counts to 0 when no relation data exists', async function () {
            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [], products: [],
                posts: [{id: postId, title: 'Test Post', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
                posts_authors: [{post_id: postId, name: 'A'}],
                posts_tags: [],
                emails: [{post_id: postId, email_count: 100, opened_count: 50, feedback_enabled: true, track_clicks: true, recipient_filter: 'all'}],
                members_click_events: [],
                members_created_events: [],
                members_subscription_created_events: [],
                members_feedback: [],
                posts_products: [],
                posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].clicks, 0);
            assert.equal(posts[0].signups, 0);
            assert.equal(posts[0].paid_conversions, 0);
            assert.equal(posts[0].feedback_more_like_this, 0);
            assert.equal(posts[0].feedback_less_like_this, 0);
        });

        it('Joins multiple authors and tags with commas', async function () {
            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [], products: [],
                posts: [{id: postId, title: 'Test Post', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
                posts_authors: [
                    {post_id: postId, name: 'Author A'},
                    {post_id: postId, name: 'Author B'},
                    {post_id: postId, name: 'Author C'}
                ],
                posts_tags: [
                    {post_id: postId, name: 'Tag X'},
                    {post_id: postId, name: 'Tag Y'}
                ],
                emails: [{post_id: postId, email_count: 100, opened_count: 50, feedback_enabled: true, track_clicks: true, recipient_filter: 'all'}],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].author, 'Author A, Author B, Author C');
            assert.equal(posts[0].tags, 'Tag X, Tag Y');
        });

        it('Maps sent status to emailed only', async function () {
            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [], products: [],
                posts: [{id: postId, title: 'Test Post', status: 'sent', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
                posts_authors: [{post_id: postId, name: 'A'}],
                posts_tags: [],
                emails: [{post_id: postId, email_count: 256, opened_count: 128, feedback_enabled: true, track_clicks: true, recipient_filter: 'all'}],
                members_click_events: [{post_id: postId, count: 64}],
                members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].status, 'emailed only');
            assert.equal(posts[0].sends, 256);
            assert.equal(posts[0].opens, 128);
            assert.equal(posts[0].clicks, 64);
        });

        it('Clears email data for scheduled posts', async function () {
            const secondNewsletterId = createModel({}).id;

            knex = createStreamingKnex({
                newsletters: [
                    {id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true},
                    {id: secondNewsletterId, name: 'Weekly Newsletter', feedback_enabled: true}
                ],
                labels: [], products: [],
                posts: [{id: postId, title: 'Scheduled', status: 'scheduled', visibility: 'public', featured: false, created_at: new Date(), published_at: null, updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
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
            assert.equal(posts[0].status, 'scheduled');
            assert.equal(posts[0].published_at, null);
            assert.equal(posts[0].sends, null);
            assert.equal(posts[0].opens, null);
            assert.equal(posts[0].clicks, null);
            assert.equal(posts[0].newsletter_name, null);
            assert.equal(posts[0].feedback_more_like_this, null);
            assert.equal(posts[0].feedback_less_like_this, null);
            assert.equal(posts[0].signups, null);
            assert.equal(posts[0].paid_conversions, null);
        });

        it('Returns correct post_access for each visibility type', async function () {
            const postIds = [postId, createModel({}).id, createModel({}).id, createModel({}).id, createModel({}).id];

            models.Post = createModelClass({
                findAll: postIds.map(id => ({id}))
            });

            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [], products: [],
                posts: [
                    {id: postIds[0], title: 'P1', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: null, uuid: 'u1'},
                    {id: postIds[1], title: 'P2', status: 'published', visibility: 'members', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: null, uuid: 'u2'},
                    {id: postIds[2], title: 'P3', status: 'published', visibility: 'paid', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: null, uuid: 'u3'},
                    {id: postIds[3], title: 'P4', status: 'published', visibility: 'tiers', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: null, uuid: 'u4'},
                    {id: postIds[4], title: 'P5', status: 'published', visibility: 'unsupported', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: null, uuid: 'u5'}
                ],
                posts_authors: postIds.map(id => ({post_id: id, name: 'A'})),
                posts_tags: [],
                emails: [],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [],
                posts_products: [
                    {post_id: postIds[3], product_id: 'tier1', name: 'Silver'},
                    {post_id: postIds[3], product_id: 'tier2', name: 'Gold'}
                ],
                posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].post_access, 'Public');
            assert.equal(posts[1].post_access, 'Members-only');
            assert.equal(posts[2].post_access, 'Paid members-only');
            assert.equal(posts[3].post_access, 'Specific tiers: Silver, Gold');
            assert.equal(posts[4].post_access, 'unsupported');
        });

        it('Returns empty tiers for tier-restricted post with no tiers', async function () {
            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [], products: [],
                posts: [{id: postId, title: 'Test', status: 'published', visibility: 'tiers', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: null, uuid: 'u1'}],
                posts_authors: [{post_id: postId, name: 'A'}],
                posts_tags: [],
                emails: [],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].post_access, 'Specific tiers: none');
        });

        it('Produces the expected ordered field set', async function () {
            const secondNewsletterId = createModel({}).id;

            knex = createStreamingKnex({
                newsletters: [
                    {id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true},
                    {id: secondNewsletterId, name: 'Weekly Newsletter', feedback_enabled: true}
                ],
                labels: [], products: [],
                posts: [{id: postId, title: 'Test Post', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
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

        it('Resolves email recipient filter labels', async function () {
            knex = createStreamingKnex({
                newsletters: [{id: newsletterId, name: 'Daily Newsletter', feedback_enabled: true}],
                labels: [{id: 'l1', slug: 'vip', name: 'VIP'}],
                products: [],
                posts: [{id: postId, title: 'Test Post', status: 'published', visibility: 'public', featured: false, created_at: new Date(), published_at: new Date(), updated_at: new Date(), newsletter_id: newsletterId, uuid: 'u1'}],
                posts_authors: [{post_id: postId, name: 'A'}],
                posts_tags: [],
                emails: [{post_id: postId, email_count: 100, opened_count: 50, feedback_enabled: true, track_clicks: true, recipient_filter: 'label:vip'}],
                members_click_events: [], members_created_events: [], members_subscription_created_events: [],
                members_feedback: [], posts_products: [], posts_meta: []
            });

            exporter = new PostsExporter({
                models, knex, settingsCache, settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const posts = await collectStream(await exporter.exportStream({}));
            assert.equal(posts[0].email_recipients, 'VIP');
        });
    });
});
