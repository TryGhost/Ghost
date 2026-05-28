const assert = require('node:assert/strict');
const {createLlmsService} = require('../../../../../core/frontend/services/llms/service');

describe('Unit: frontend/services/llms/service', function () {
    function createFakeSettingsCache(overrides = {}) {
        const values = {
            description: 'Short description',
            is_private: false,
            llms_enabled: true,
            machine_payments_enabled: false,
            meta_description: 'Meta description',
            title: 'Ghost Site'
        };
        Object.assign(values, overrides);

        return {
            get(key) {
                return values[key];
            }
        };
    }

    function createFakeConfig() {
        return {
            get(key) {
                const map = {
                    url: 'http://127.0.0.1:2368'
                };
                return map[key];
            }
        };
    }

    function createFakeUrlServiceFacade(urlMap) {
        return {
            getUrlForResource(resource) {
                return urlMap[resource.id] || null;
            }
        };
    }

    function createFakeModels({posts = [], paidPosts = [], findOneEntry = null, callCounter = null} = {}) {
        return {
            Post: {
                findPage: async function (options) {
                    if (callCounter) {
                        callCounter.count += 1;
                    }

                    if (options.filter.includes('visibility:[paid,tiers]')) {
                        return {data: paidPosts.map(p => ({toJSON: () => p}))};
                    }

                    return {data: posts.map(p => ({toJSON: () => p}))};
                },
                findOne: async function () {
                    return findOneEntry ? {toJSON: () => findOneEntry} : null;
                }
            }
        };
    }

    function createFakeLabs(flags = {llmsTxt: true, machinePayments: false}) {
        return {
            isSet(flag) {
                return !!flags[flag];
            }
        };
    }

    function createService(opts = {}) {
        const urlMap = opts.urlMap || {};

        return createLlmsService({
            settingsCache: opts.settingsCache || createFakeSettingsCache(opts.settingsOverrides),
            labs: opts.labs || createFakeLabs(opts.labsFlags),
            config: opts.config || createFakeConfig(),
            urlServiceFacade: opts.urlServiceFacade || createFakeUrlServiceFacade(urlMap),
            models: opts.models || createFakeModels(opts),
            api: opts.api || {},
            fullTxtBudget: opts.fullTxtBudget
        });
    }

    it('builds llms.txt with reverse chronological markdown post URLs and truncated descriptions', async function () {
        const longDescription = 'A'.repeat(320);
        const service = createService({
            posts: [
                {id: 'post-a', title: 'Recent Post', slug: 'recent-post', custom_excerpt: longDescription, published_at: '2026-04-15T00:00:00.000Z', type: 'post'},
                {id: 'post-b', title: 'Older Post', slug: 'older-post', plaintext: 'Older summary', published_at: '2026-03-15T00:00:00.000Z', type: 'post'}
            ],
            urlMap: {
                'post-a': 'https://example.com/2026/04/recent-post/',
                'post-b': 'https://example.com/2026/03/older-post/'
            }
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /^# Ghost Site/m);
        assert.match(llmsTxt, /^# Ghost Site\n\n- \[Recent Post\]/m);
        assert.doesNotMatch(llmsTxt, /^> Meta description/m);
        assert.doesNotMatch(llmsTxt, /Public Ghost content for AI and LLM tooling/);
        assert.match(llmsTxt, /\[Recent Post\]\(https:\/\/example\.com\/2026\/04\/recent-post\.md\): A{299}…/);
        assert.match(llmsTxt, /\[Older Post\]\(https:\/\/example\.com\/2026\/03\/older-post\.md\): Older summary\n$/m);
        assert.doesNotMatch(llmsTxt, /## Pages/);
        assert.doesNotMatch(llmsTxt, /RSS Feed/);
        assert.doesNotMatch(llmsTxt, /Sitemap/);
    });

    it('includes paid members-only posts in llms.txt when machine payments are enabled', async function () {
        const service = createService({
            settingsOverrides: {machine_payments_enabled: true},
            labsFlags: {llmsTxt: true, machinePayments: true},
            posts: [
                {id: 'post-public', title: 'Public Post', plaintext: 'Public summary', published_at: '2026-04-01T00:00:00.000Z', type: 'post'}
            ],
            paidPosts: [
                {id: 'post-paid', title: 'Paid Post', html: '<p>Public preview</p><!--members-only--><p>Paid body</p>', visibility: 'paid', published_at: '2026-05-01T00:00:00.000Z', type: 'post'}
            ],
            urlMap: {
                'post-public': 'https://example.com/public/',
                'post-paid': 'https://example.com/paid/'
            }
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /\[Paid Post\]\(https:\/\/example\.com\/paid\.md\): Public preview/);
        assert.match(llmsTxt, /\[Public Post\]\(https:\/\/example\.com\/public\.md\): Public summary/);
        assert.ok(llmsTxt.indexOf('Paid Post') < llmsTxt.indexOf('Public Post'));
    });

    it('excludes paid posts from llms.txt when machine payments are disabled', async function () {
        const service = createService({
            posts: [],
            paidPosts: [
                {id: 'post-paid', title: 'Paid Post', visibility: 'paid', published_at: '2026-05-01T00:00:00.000Z', type: 'post'}
            ],
            urlMap: {
                'post-paid': 'https://example.com/paid/'
            }
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.doesNotMatch(llmsTxt, /Paid Post/);
    });

    it('returns null when labs flag is off', async function () {
        const service = createService({
            labsFlags: {llmsTxt: false},
            posts: [],
            urlMap: {}
        });

        const result = await service.getLlmsTxt();
        assert.equal(result, null);
    });

    it('returns null when site is private', async function () {
        const service = createService({
            settingsOverrides: {is_private: true},
            posts: [],
            urlMap: {}
        });

        const result = await service.getLlmsTxt();
        assert.equal(result, null);
    });

    it('returns null when llms_enabled is false', async function () {
        const service = createService({
            settingsOverrides: {llms_enabled: false},
            posts: [],
            urlMap: {}
        });

        const result = await service.getLlmsTxt();
        assert.equal(result, null);
    });

    it('builds llms-full.txt with readable block spacing', async function () {
        const service = createService({
            posts: [
                {id: 'post-a', title: 'A Post', slug: 'a-post', html: '<p>Post body</p>', updated_at: '2026-04-15T00:00:00.000Z', type: 'post'}
            ],
            urlMap: {
                'post-a': 'https://example.com/a-post/'
            }
        });

        const llmsFullTxt = await service.getLlmsFullTxt();

        assert.match(llmsFullTxt, /^# Ghost Site\n> Meta description\n\n## A Post\nURL: https:\/\/example\.com\/a-post\//);
        assert.match(llmsFullTxt, /Last updated: 2026-04-15T00:00:00.000Z\n\nPost body\n$/);
        assert.doesNotMatch(llmsFullTxt, /Public Ghost content for AI and LLM tooling/);
    });

    it('bounds llms-full.txt at budget without appending hardcoded copy', async function () {
        const service = createService({
            posts: [{
                id: 'post-a',
                title: 'Large Post',
                slug: 'large-post',
                html: `<p>${'x'.repeat(2000)}</p>`,
                updated_at: '2026-04-14T00:00:00.000Z',
                type: 'post'
            }],
            fullTxtBudget: 1024,
            urlMap: {
                'post-a': 'https://example.com/post/'
            }
        });

        const llmsFullTxt = await service.getLlmsFullTxt();

        assert.match(llmsFullTxt, /^# Ghost Site/);
        assert.doesNotMatch(llmsFullTxt, /Large Post/);
        assert.doesNotMatch(llmsFullTxt, /Truncated after 5 MiB/);
    });

    it('computes fresh output on every call', async function () {
        const callCounter = {count: 0};
        const service = createService({
            models: createFakeModels({posts: [], callCounter}),
            urlMap: {}
        });

        await service.getLlmsTxt();
        await service.getLlmsTxt();

        assert.equal(callCounter.count, 2);
    });

    describe('fetchPublicEntry', function () {
        it('calls the correct controller for pages vs posts', async function () {
            const calls = [];
            const fakeApi = {
                pagesPublic: {
                    read: async (opts) => {
                        calls.push({controller: 'pages', opts});
                        return {pages: [{id: 'p1', title: 'Page'}]};
                    }
                },
                postsPublic: {
                    read: async (opts) => {
                        calls.push({controller: 'posts', opts});
                        return {posts: [{id: 'p2', title: 'Post'}]};
                    }
                }
            };

            const service = createService({api: fakeApi, posts: [], urlMap: {}});

            const page = await service.fetchPublicEntry('pages', 'p1');
            assert.equal(page.title, 'Page');
            assert.equal(calls[0].controller, 'pages');
            assert.equal(calls[0].opts.id, 'p1');
            assert.equal(calls[0].opts.formats, 'html,plaintext');
            assert.equal(calls[0].opts.include, 'authors,tags');

            const post = await service.fetchPublicEntry('posts', 'p2');
            assert.equal(post.title, 'Post');
            assert.equal(calls[1].controller, 'posts');
        });

        it('forwards member context', async function () {
            let capturedContext;
            const fakeApi = {
                postsPublic: {
                    read: async (opts) => {
                        capturedContext = opts.context;
                        return {posts: [{id: 'p1'}]};
                    }
                }
            };

            const service = createService({api: fakeApi, posts: [], urlMap: {}});
            const member = {id: 'member-1'};
            await service.fetchPublicEntry('posts', 'p1', member);

            assert.deepEqual(capturedContext, {member});
        });

        it('returns null when entry not found', async function () {
            const fakeApi = {
                postsPublic: {
                    read: async () => ({posts: []})
                }
            };

            const service = createService({api: fakeApi, posts: [], urlMap: {}});
            const result = await service.fetchPublicEntry('posts', 'missing');
            assert.equal(result, null);
        });
    });

    describe('fetchPaidEntry', function () {
        it('fetches a published entry directly from models and resolves its URL', async function () {
            const service = createService({
                findOneEntry: {id: 'paid-post', title: 'Paid Post', type: 'post', visibility: 'paid'},
                urlMap: {
                    'paid-post': 'https://example.com/paid/'
                }
            });

            const entry = await service.fetchPaidEntry('posts', 'paid-post');

            assert.equal(entry.title, 'Paid Post');
            assert.equal(entry.url, 'https://example.com/paid/');
        });

        it('returns null when the paid entry has no routable URL', async function () {
            const service = createService({
                findOneEntry: {id: 'missing-post', title: 'Missing Post', type: 'post', visibility: 'paid'},
                urlMap: {
                    'missing-post': 'https://example.com/404/'
                }
            });

            const entry = await service.fetchPaidEntry('posts', 'missing-post');

            assert.equal(entry, null);
        });
    });

    it('filters out entries that resolve to /404/', async function () {
        const service = createService({
            posts: [
                {id: 'post-good', title: 'Good Post', slug: 'good', type: 'post'},
                {id: 'post-bad', title: 'Bad Post', slug: 'bad', type: 'post'}
            ],
            urlMap: {
                'post-good': 'https://example.com/good/',
                'post-bad': 'https://example.com/404/'
            }
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /Good Post/);
        assert.doesNotMatch(llmsTxt, /Bad Post/);
    });
});
