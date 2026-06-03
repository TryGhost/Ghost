const assert = require('node:assert/strict');
const {createLlmsService} = require('../../../../../core/frontend/services/llms/service');

describe('Unit: frontend/services/llms/service', function () {
    function createFakeSettingsCache(overrides = {}) {
        const values = {
            description: 'Short description',
            is_private: false,
            llms_enabled: true,
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

    function createFakeModels(pageData, postData) {
        return {
            Post: {
                findPage: async function (options) {
                    if (options.filter.includes('type:page')) {
                        return {data: pageData.map(p => ({toJSON: () => p}))};
                    }
                    return {data: postData.map(p => ({toJSON: () => p}))};
                }
            }
        };
    }

    function createFakeRouting() {
        return {
            registry: {
                getRssUrl() {
                    return 'https://example.com/rss/';
                }
            }
        };
    }

    function createFakeUrlUtils() {
        return {
            urlFor(options, absolute) {
                const base = absolute ? 'http://127.0.0.1:2368' : '';
                return `${base}${options.relativeUrl}`;
            }
        };
    }

    function createFakeLabs(flags = {llmsTxt: true}) {
        return {
            isSet(flag) {
                return !!flags[flag];
            }
        };
    }

    function createService(opts = {}) {
        const pages = opts.pages || [];
        const posts = opts.posts || [];
        const urlMap = opts.urlMap || {};

        return createLlmsService({
            settingsCache: opts.settingsCache || createFakeSettingsCache(opts.settingsOverrides),
            labs: opts.labs || createFakeLabs(opts.labsFlags),
            config: opts.config || createFakeConfig(),
            urlServiceFacade: opts.urlServiceFacade || createFakeUrlServiceFacade(urlMap),
            urlUtils: opts.urlUtils || createFakeUrlUtils(),
            models: opts.models || createFakeModels(pages, posts),
            routing: opts.routing || createFakeRouting(),
            api: opts.api || {},
            fullTxtBudget: opts.fullTxtBudget
        });
    }

    it('builds llms.txt with markdown URLs, stable page ordering, and truncated descriptions', async function () {
        const longDescription = 'A'.repeat(320);

        const service = createService({
            pages: [
                {id: 'page-b', title: 'B Page', slug: 'contact', custom_excerpt: 'Second page', type: 'page'},
                {id: 'page-a', title: 'A Page', slug: 'about', custom_excerpt: 'First page', type: 'page'}
            ],
            posts: [
                {id: 'post-a', title: 'Recent Post', slug: 'recent-post', custom_excerpt: longDescription, type: 'post'},
                {id: 'post-b', title: 'Older Post', slug: 'older-post', plaintext: 'Older summary', type: 'post'}
            ],
            urlMap: {
                'page-a': 'https://example.com/about/',
                'page-b': 'https://example.com/contact/',
                'post-a': 'https://example.com/2026/04/recent-post/',
                'post-b': 'https://example.com/2026/03/older-post/'
            }
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /^# Ghost Site/m);
        assert.match(llmsTxt, /^> Meta description/m);
        assert.match(llmsTxt, /## Pages[\s\S]*\[A Page\]\(https:\/\/example\.com\/about\.md\)[\s\S]*\[B Page\]\(https:\/\/example\.com\/contact\.md\)/m);
        assert.match(llmsTxt, /\[Recent Post\]\(https:\/\/example\.com\/2026\/04\/recent-post\.md\) - A{299}…/);
        assert.match(llmsTxt, /## Optional[\s\S]*\[RSS Feed\]\(https:\/\/example\.com\/rss\/\)/m);
        assert.match(llmsTxt, /\[Sitemap\]\(http:\/\/127\.0\.0\.1:\d+\/sitemap\.xml\)/);
    });

    it('returns null when labs flag is off', async function () {
        const service = createService({
            labsFlags: {llmsTxt: false},
            pages: [],
            posts: [],
            urlMap: {}
        });

        const result = await service.getLlmsTxt();
        assert.equal(result, null);
    });

    it('returns null when site is private', async function () {
        const service = createService({
            settingsOverrides: {is_private: true},
            pages: [],
            posts: [],
            urlMap: {}
        });

        const result = await service.getLlmsTxt();
        assert.equal(result, null);
    });

    it('returns null when llms_enabled is false', async function () {
        const service = createService({
            settingsOverrides: {llms_enabled: false},
            pages: [],
            posts: [],
            urlMap: {}
        });

        const result = await service.getLlmsTxt();
        assert.equal(result, null);
    });

    it('bounds llms-full.txt at budget and appends a truncation note', async function () {
        const largePageData = [{
            id: 'page-a',
            title: 'Large Page',
            slug: 'large-page',
            html: `<p>${'x'.repeat(2000)}</p>`,
            plaintext: 'large page body',
            updated_at: '2026-04-14T00:00:00.000Z',
            type: 'page'
        }];

        const postData = [{
            id: 'post-a',
            title: 'Post That Should Not Fit',
            slug: 'post',
            html: '<p>post body</p>',
            plaintext: 'post body',
            updated_at: '2026-04-14T00:00:00.000Z',
            type: 'post'
        }];

        const models = {
            Post: {
                findPage: async function (options) {
                    if (options.filter.includes('type:page')) {
                        return {data: largePageData.map(p => ({toJSON: () => p}))};
                    }
                    return {data: postData.map(p => ({toJSON: () => p}))};
                }
            }
        };

        const service = createService({
            models,
            fullTxtBudget: 1024,
            urlMap: {
                'page-a': 'https://example.com/about/',
                'post-a': 'https://example.com/post/'
            }
        });

        const llmsFullTxt = await service.getLlmsFullTxt();

        assert.match(llmsFullTxt, /## Pages/);
        assert.doesNotMatch(llmsFullTxt, /## Posts/);
        assert.match(llmsFullTxt, /Truncated after 5 MiB/);
    });

    it('computes fresh output on every call (no cache)', async function () {
        let callCount = 0;

        const models = {
            Post: {
                findPage: async function () {
                    callCount += 1;
                    return {data: []};
                }
            }
        };

        const service = createService({models, urlMap: {}});

        await service.getLlmsTxt();
        await service.getLlmsTxt();

        assert.ok(callCount >= 4, `Expected at least 4 DB calls (2 per getLlmsTxt), got ${callCount}`);
    });

    it('does not load post relations for llms.txt index entries', async function () {
        const calls = [];
        const models = {
            Post: {
                findPage: async function (options) {
                    calls.push(options);
                    return {data: []};
                }
            }
        };

        const service = createService({models, urlMap: {}});

        await service.getLlmsTxt();

        assert.equal(calls.length, 2);
        assert.equal(calls[0].withRelated, undefined);
        assert.equal(calls[1].withRelated, undefined);
    });

    it('does not load post relations for llms-full.txt entries', async function () {
        const calls = [];
        const models = {
            Post: {
                findPage: async function (options) {
                    calls.push(options);
                    return {data: []};
                }
            }
        };

        const service = createService({models, urlMap: {}});

        await service.getLlmsFullTxt();

        assert.equal(calls.length, 2);
        assert.equal(calls[0].withRelated, undefined);
        assert.equal(calls[1].withRelated, undefined);
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

            const service = createService({api: fakeApi, pages: [], posts: [], urlMap: {}});

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

            const service = createService({api: fakeApi, pages: [], posts: [], urlMap: {}});
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

            const service = createService({api: fakeApi, pages: [], posts: [], urlMap: {}});
            const result = await service.fetchPublicEntry('posts', 'missing');
            assert.equal(result, null);
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
            },
            pages: []
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /Good Post/);
        assert.doesNotMatch(llmsTxt, /Bad Post/);
    });
});
