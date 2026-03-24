const assert = require('node:assert/strict');
const {Readable} = require('stream');
const PostsExporter = require('../../../../../core/server/services/posts/posts-exporter');
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

/**
 * Collect all items from a readable stream into an array
 */
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
            loaded: ['tiers', 'tags', 'authors', 'email'],
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
            visibility: 'public',
            tiers: []
        };

        models = {
            Post: createModelClass({
                findAll: [post]
            }),
            Newsletter: createModelClass({
                findAll: [defaultNewsletter]
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

    describe('exportStream', function () {
        it('Returns a readable stream', async function () {
            const stream = await exporter.exportStream({});
            assert.ok(stream instanceof Readable, 'exportStream should return a Readable stream');
        });

        it('Streams post data with correct fields', async function () {
            const stream = await exporter.exportStream({});
            const posts = await collectStream(stream);

            assert.equal(posts.length, 1);
            assert.equal(posts[0].title, 'Test Post');
            assert.equal(posts[0].url, 'https://example.com/post');
            assert.equal(posts[0].author, 'Test Author');
            assert.equal(posts[0].status, 'published and emailed');
            assert.equal(posts[0].sends, 256);
            assert.equal(posts[0].opens, 128);
            assert.equal(posts[0].clicks, 64);
            assert.equal(posts[0].signups, 32);
            assert.equal(posts[0].paid_conversions, 16);
            assert.equal(posts[0].feedback_more_like_this, 8);
            assert.equal(posts[0].feedback_less_like_this, 4);
        });

        it('Streams multiple posts', async function () {
            const post2 = {
                ...post,
                title: 'Second Post'
            };
            models.Post = createModelClass({
                findAll: [post, post2]
            });

            exporter = new PostsExporter({
                models,
                settingsCache,
                settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const stream = await exporter.exportStream({});
            const posts = await collectStream(stream);

            assert.equal(posts.length, 2);
            assert.equal(posts[0].title, 'Test Post');
            assert.equal(posts[1].title, 'Second Post');
        });

        it('Hides newsletter column when only one newsletter', async function () {
            const stream = await exporter.exportStream({});
            const posts = await collectStream(stream);

            assert.equal(posts[0].newsletter_name, undefined);
        });

        it('Hides member columns when members disabled', async function () {
            settingsHelpers.isMembersEnabled = () => false;

            exporter = new PostsExporter({
                models,
                settingsCache,
                settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const stream = await exporter.exportStream({});
            const posts = await collectStream(stream);

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
            defaultNewsletter.feedback_enabled = false;

            exporter = new PostsExporter({
                models,
                settingsCache,
                settingsHelpers,
                getPostUrl: () => 'https://example.com/post'
            });

            const stream = await exporter.exportStream({});
            const posts = await collectStream(stream);

            assert.equal(posts[0].feedback_more_like_this, undefined);
            assert.equal(posts[0].feedback_less_like_this, undefined);
            // Other columns should still be present
            assert.notEqual(posts[0].sends, undefined);
        });
    });
});
