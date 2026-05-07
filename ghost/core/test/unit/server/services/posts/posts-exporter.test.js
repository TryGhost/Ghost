const PostsExporter = require('../../../../../core/server/services/posts/posts-exporter');
const assert = require('node:assert/strict');
const {assertMatchSnapshot} = require('../../../../utils/assertions');
const {Readable} = require('stream');
const {createModelClass, createModel} = require('./utils');

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

describe('PostsExporter', function () {
    it('Can construct class', function () {
        new PostsExporter({});
    });

    describe('export', function () {
        let exporter;
        let models;
        let post;
        let settingsCache;
        let settingsHelpers;
        let defaultNewsletter;

        beforeEach(function () {
            defaultNewsletter = {
                id: createModel({}).id,
                name: 'Daily Newsletter',
                feedback_enabled: true
            };

            post = {
                title: 'Test Post',
                status: 'published',
                created_at: new Date(),
                published_at: new Date(),
                updated_at: new Date(),
                featured: false,
                loaded: ['tiers','tags','authors','email'],
                email: createModel({
                    feedback_enabled: true,
                    track_clicks: true,
                    email_count: 256,
                    opened_count: 128
                }),
                count__clicks: 64,
                count__signups: 32,
                count__paid_conversions: 16,
                count__positive_feedback: 8,
                count__negative_feedback: 4,
                newsletter_id: defaultNewsletter.id,
                authors: [
                    createModel({
                        name: 'Test Author'
                    })
                ],
                tags: [
                    createModel({
                        name: 'Test Tag'
                    })
                ],
                visibility: 'tiers',
                tiers: [
                    createModel({
                        name: 'Silver'
                    }),
                    createModel({
                        name: 'Gold'
                    })
                ]
            };
            models = {
                Post: createModelClass({
                    findAll: [
                        post
                    ]
                }),
                Newsletter: createModelClass({
                    findAll: [
                        defaultNewsletter
                    ]
                }),
                Label: createModelClass({
                    findAll: []
                }),
                Product: createModelClass({
                    findAll: []
                })
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
                settingsCache,
                settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });
        });

        it('Can export posts', async function () {
            const posts = await collectStream(await exporter.export({}));
            assert.equal(posts.length, 1);

            // Hides newsletter column
            assert.equal(posts[0].newsletter_name, undefined);

            // Check status
            assert.equal(posts[0].status, 'published and emailed');
        });

        it('Can export posts without an email', async function () {
            post.email = null;
            const posts = await collectStream(await exporter.export({}));
            assert.equal(posts.length, 1);

            // Hides newsletter column
            assert.equal(posts[0].newsletter_name, undefined);

            // Check status
            assert.equal(posts[0].status, 'published only');
        });

        it('Adds newsletter columns if multiple newsletters', async function () {
            const secondNewsletter = {
                id: createModel({}).id,
                name: 'Weekly Newsletter',
                feedback_enabled: true
            };
            models.Newsletter.options.findAll.push(secondNewsletter);
            models.Post.options.findAll.push({
                ...post,
                newsletter_id: models.Newsletter.options.findAll[1].id
            });
            const posts = await collectStream(await exporter.export({}));
            assert.equal(posts.length, 2);

            // Shows newsletter column
            assert.equal(posts[0].newsletter_name, 'Daily Newsletter');
            assert.equal(posts[1].newsletter_name, 'Weekly Newsletter');

            // Shows feedback columns
            assert.equal(posts[0].feedback_more_like_this, post.count__positive_feedback);
            assert.equal(posts[0].feedback_less_like_this, post.count__negative_feedback);
        });

        it('Hides feedback columns if feedback disabled for all newsletters', async function () {
            defaultNewsletter.feedback_enabled = false;
            const posts = await collectStream(await exporter.export({}));

            // Hides feedback columns
            assert.equal(posts[0].feedback_more_like_this, undefined);
            assert.equal(posts[0].feedback_less_like_this, undefined);
        });

        it('Hides email related analytics when post status is draft', async function () {
            const secondNewsletter = {
                id: createModel({}).id,
                name: 'Weekly Newsletter',
                feedback_enabled: true
            };
            models.Newsletter.options.findAll.push(secondNewsletter);
            post.status = 'draft';
            const posts = await collectStream(await exporter.export({}));

            // Feedback columns are empty, but present because of global settings (newsletter with feedback enabled)
            assert.equal(posts[0].feedback_more_like_this, null);
            assert.equal(posts[0].feedback_less_like_this, null);

            // Sends etc
            assert.equal(posts[0].sends, null);
            assert.equal(posts[0].opens, null);
            assert.equal(posts[0].clicks, null);
            assert.equal(posts[0].newsletter_name, null);

            // Signups
            assert.equal(posts[0].signups, null);
            assert.equal(posts[0].paid_conversions, null);
        });

        it('Hides member related columns if members disabled', async function () {
            settingsHelpers.isMembersEnabled = () => false;
            const posts = await collectStream(await exporter.export({}));
            assert.equal(posts[0].email_recipients, undefined);

            // No feedback columns
            assert.equal(posts[0].feedback_more_like_this, undefined);
            assert.equal(posts[0].feedback_less_like_this, undefined);

            // Sends etc
            assert.equal(posts[0].sends, undefined);
            assert.equal(posts[0].opens, undefined);
            assert.equal(posts[0].clicks, undefined);

            // Signups
            assert.equal(posts[0].signups, undefined);
            assert.equal(posts[0].paid_conversions, undefined);
        });

        it('Hides clicks if disabled', async function () {
            settingsCache.set('email_track_clicks', false);
            const posts = await collectStream(await exporter.export({}));

            assert.notEqual(posts[0].email_recipients, undefined);
            assert.notEqual(posts[0].feedback_more_like_this, undefined);
            assert.notEqual(posts[0].feedback_less_like_this, undefined);
            assert.notEqual(posts[0].sends, undefined);
            assert.notEqual(posts[0].opens, undefined);
            assert.notEqual(posts[0].signups, undefined);
            assert.notEqual(posts[0].paid_conversions, undefined);

            assert.equal(posts[0].clicks, undefined);
        });

        it('Hides opens if disabled', async function () {
            settingsCache.set('email_track_opens', false);
            const posts = await collectStream(await exporter.export({}));

            assert.notEqual(posts[0].email_recipients, undefined);
            assert.notEqual(posts[0].feedback_more_like_this, undefined);
            assert.notEqual(posts[0].feedback_less_like_this, undefined);
            assert.notEqual(posts[0].sends, undefined);
            assert.notEqual(posts[0].clicks, undefined);
            assert.notEqual(posts[0].signups, undefined);
            assert.notEqual(posts[0].paid_conversions, undefined);

            assert.equal(posts[0].opens, undefined);
        });

        it('Hides paid member related columns if paid members disabled', async function () {
            settingsHelpers.arePaidMembersEnabled = () => false;
            const posts = await collectStream(await exporter.export({}));

            assert.notEqual(posts[0].email_recipients, undefined);
            assert.notEqual(posts[0].feedback_more_like_this, undefined);
            assert.notEqual(posts[0].feedback_less_like_this, undefined);
            assert.notEqual(posts[0].sends, undefined);
            assert.notEqual(posts[0].clicks, undefined);
            assert.notEqual(posts[0].signups, undefined);
            assert.notEqual(posts[0].opens, undefined);

            assert.equal(posts[0].paid_conversions, undefined);
        });

        it('Works if relations not loaded correctly', async function () {
            delete post.count__clicks;
            delete post.count__signups;
            delete post.count__paid_conversions;
            delete post.count__positive_feedback;
            delete post.count__negative_feedback;

            const posts = await collectStream(await exporter.export({}));
            assert.equal(posts.length, 1);

            assert.equal(posts[0].clicks, 0);
            assert.equal(posts[0].signups, 0);
            assert.equal(posts[0].paid_conversions, 0);
            assert.equal(posts[0].feedback_more_like_this, 0);
            assert.equal(posts[0].feedback_less_like_this, 0);
        });

        it('Streams exports in stable pages when limit is greater than one batch', async function () {
            const findPageCalls = [];
            const posts = Array.from({length: 80}, (_, index) => ({
                ...post,
                id: `post-${index + 1}`,
                title: `Post ${index + 1}`,
                email: createModel({
                    feedback_enabled: true,
                    track_clicks: true,
                    email_count: 256,
                    opened_count: 128
                })
            }));

            models.Post = {
                findPage: async (options) => {
                    findPageCalls.push(options);

                    const start = (options.page - 1) * options.limit;
                    const pageData = posts.slice(start, start + options.limit);

                    return {
                        data: pageData.map(data => createModel({...data, ...options}))
                    };
                }
            };

            const stream = await exporter.export({limit: 75});
            assert.ok(stream instanceof Readable || typeof stream.pipe === 'function');

            const exportedPosts = await collectStream(stream);
            assert.equal(exportedPosts.length, 75);
            assert.deepEqual(exportedPosts.map(exportedPost => exportedPost.id), posts.slice(0, 75).map(data => data.id));
            assert.deepEqual(findPageCalls.map(call => call.limit), [50, 50]);
            assert.deepEqual(findPageCalls.map(call => call.page), [1, 2]);
            assert.ok(findPageCalls.every(call => call.skipPagination === true));
        });

        it('Keeps custom ordered stream exports stable across page boundaries', async function () {
            const posts = Array.from({length: 60}, (_, index) => ({
                ...post,
                id: `post-${String(index + 1).padStart(2, '0')}`,
                title: `Post ${String(index + 1).padStart(2, '0')}`,
                published_at: new Date('2026-01-01T00:00:00.000Z'),
                email: createModel({
                    feedback_enabled: true,
                    track_clicks: true,
                    email_count: 256,
                    opened_count: 128
                })
            }));
            const findPageCalls = [];

            models.Post = {
                findPage: async (options) => {
                    if (options.stableOrder && !options.order.split(',').some(orderPart => orderPart.trim().toLowerCase().startsWith('id '))) {
                        options.order = `${options.order}, id desc`;
                    }
                    findPageCalls.push(options);

                    // Simulate a database returning a different tie order for page 2
                    // when the requested order does not include a unique tie-breaker.
                    const hasStableOrder = options.order.split(',').some(orderPart => orderPart.trim().toLowerCase().startsWith('id '));
                    const orderedPosts = options.page === 2 && !hasStableOrder
                        ? [
                            ...posts.slice(0, 49),
                            posts[50],
                            posts[49],
                            ...posts.slice(51)
                        ]
                        : posts;
                    const start = (options.page - 1) * options.limit;
                    const pageData = orderedPosts.slice(start, start + options.limit);

                    return {
                        data: pageData.map(data => createModel({...data, ...options}))
                    };
                }
            };

            const exportedPosts = await collectStream(await exporter.export({
                limit: 'all',
                order: 'published_at desc'
            }));
            const exportedIds = exportedPosts.map(exportedPost => exportedPost.id);
            const expectedIds = posts.map(data => data.id);
            const duplicateIds = exportedIds.filter((id, index) => exportedIds.indexOf(id) !== index);
            const missingIds = expectedIds.filter(id => !exportedIds.includes(id));

            assertMatchSnapshot({
                requestedOrders: findPageCalls.map(call => call.order),
                exportedIds,
                duplicateIds,
                missingIds
            });
        });

        it('Preserves the default export limit when no limit is supplied', async function () {
            const posts = Array.from({length: 20}, (_, index) => ({
                ...post,
                id: `post-${index + 1}`,
                title: `Post ${index + 1}`,
                email: createModel({
                    feedback_enabled: true,
                    track_clicks: true,
                    email_count: 256,
                    opened_count: 128
                })
            }));

            models.Post = {
                findPage: async (options) => {
                    const start = (options.page - 1) * options.limit;
                    const pageData = posts.slice(start, start + options.limit);

                    return {
                        data: pageData.map(data => createModel({...data, ...options}))
                    };
                }
            };

            const exportedPosts = await collectStream(await exporter.export({}));

            assert.equal(exportedPosts.length, 15);
            assert.deepEqual(exportedPosts.map(exportedPost => exportedPost.id), posts.slice(0, 15).map(data => data.id));
        });

        it('Falls back to the default export limit when an invalid limit is supplied', async function () {
            const posts = Array.from({length: 20}, (_, index) => ({
                ...post,
                id: `post-${index + 1}`,
                title: `Post ${index + 1}`,
                email: createModel({
                    feedback_enabled: true,
                    track_clicks: true,
                    email_count: 256,
                    opened_count: 128
                })
            }));

            models.Post = {
                findPage: async (options) => {
                    const start = (options.page - 1) * options.limit;
                    const pageData = posts.slice(start, start + options.limit);

                    return {
                        data: pageData.map(data => createModel({...data, ...options}))
                    };
                }
            };

            const exportedPosts = await collectStream(await exporter.export({limit: 'invalid'}));

            assert.equal(exportedPosts.length, 15);
            assert.deepEqual(exportedPosts.map(exportedPost => exportedPost.id), posts.slice(0, 15).map(data => data.id));
        });
    });

    describe('mapPostStatus', function () {
        const exporter = new PostsExporter({});

        it('Returns draft', function () {
            assert.equal(
                exporter.mapPostStatus('draft', false),
                'draft'
            );
        });

        it('Returns scheduled', function () {
            assert.equal(
                exporter.mapPostStatus('scheduled', false),
                'scheduled'
            );
        });

        it('Returns emailed only', function () {
            assert.equal(
                exporter.mapPostStatus('sent', false),
                'emailed only'
            );
        });

        it('Returns published and emailed', function () {
            assert.equal(
                exporter.mapPostStatus('published', true),
                'published and emailed'
            );
        });

        it('Returns published only', function () {
            assert.equal(
                exporter.mapPostStatus('published', false),
                'published only'
            );
        });

        it('Returns unsupported', function () {
            assert.equal(
                exporter.mapPostStatus('unsupported', false),
                'unsupported'
            );
        });
    });

    describe('postAccessToString', function () {
        const exporter = new PostsExporter({});

        it('Returns public', function () {
            const access = exporter.postAccessToString(
                createModel({
                    visibility: 'public'
                })
            );
            assert.equal(
                access,
                'Public'
            );
        });

        it('Returns members', function () {
            const access = exporter.postAccessToString(
                createModel({
                    visibility: 'members'
                })
            );
            assert.equal(
                access,
                'Members-only'
            );
        });

        it('Returns paid', function () {
            const access = exporter.postAccessToString(
                createModel({
                    visibility: 'paid'
                })
            );
            assert.equal(
                access,
                'Paid members-only'
            );
        });

        it('Returns empty tiers', function () {
            const access = exporter.postAccessToString(
                createModel({
                    visibility: 'tiers',
                    loaded: ['tiers'],
                    tiers: []
                })
            );
            assert.equal(
                access,
                'Specific tiers: none'
            );
        });

        it('Returns multiple tiers', function () {
            const access = exporter.postAccessToString(
                createModel({
                    visibility: 'tiers',
                    loaded: ['tiers'],
                    tiers: [
                        createModel({
                            name: 'Silver'
                        }),
                        createModel({
                            name: 'Gold'
                        })
                    ]
                })
            );
            assert.equal(
                access,
                'Specific tiers: Silver, Gold'
            );
        });

        it('Returns unsupported', function () {
            const access = exporter.postAccessToString(
                createModel({
                    visibility: 'unsupported'
                })
            );
            assert.equal(
                access,
                'unsupported'
            );
        });
    });

    describe('humanReadableEmailRecipientFilter', function () {
        const exporter = new PostsExporter({});
        let labels;
        let tiers;

        beforeEach(function () {
            labels = [
                createModel({
                    slug: 'imported',
                    name: 'Imported'
                }),
                createModel({
                    slug: 'vip',
                    name: 'VIP'
                })
            ];
            tiers = [
                createModel({
                    slug: 'silver',
                    name: 'Silver'
                }),
                createModel({
                    slug: 'gold',
                    name: 'Gold'
                })
            ];
        });

        it('Returns all', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('all'),
                'All subscribers'
            );
        });

        it('Returns empty', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter(''),
                ''
            );
        });

        it('Returns labels', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('label:imported', labels, tiers),
                'Imported'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('label:imported,label:vip', labels, tiers),
                'Imported, VIP'
            );
        });

        it('Returns invalid labels', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('label:invalidone', labels, tiers),
                'invalidone'
            );
        });

        it('Returns tiers', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('tier:silver', labels, tiers),
                'Silver'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('tier:silver,tier:gold', labels, tiers),
                'Silver, Gold'
            );
        });

        it('Returns invalid tiers', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('tier:invalidone', labels, tiers),
                'invalidone'
            );
        });

        it('Returns status', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:free'),
                'Free subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:-free'),
                'Paid subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:paid'),
                'Paid subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:comped'),
                'Complimentary subscribers'
            );

            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:-paid'),
                'Free subscribers'
            );
        });

        it('Ignores AND', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('status:free+status:paid', labels, tiers),
                ''
            );
        });

        it('Single brackets filter', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('(status:free)', labels, tiers),
                'Free subscribers'
            );
        });

        it('Ignores invalid filters', function () {
            assert.equal(
                exporter.humanReadableEmailRecipientFilter('sdgsdgsdg sdg sdg sdgs dgs', labels, tiers),
                'sdgsdgsdg sdg sdg sdgs dgs'
            );
        });
    });
});
