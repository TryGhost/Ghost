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

    function createFakeApi(pageData, postData, urlMap) {
        function browse(responseKey, data) {
            return async function (options) {
                const entries = data.map(item => ({...item, url: urlMap[item.id]}));
                const limit = options.limit;
                const page = options.page || 1;

                if (limit === 'all' || limit === undefined) {
                    return {
                        [responseKey]: entries,
                        meta: {pagination: {page: 1, pages: 1, limit: 'all', total: entries.length, prev: null, next: null}}
                    };
                }

                const start = (page - 1) * limit;
                const slice = entries.slice(start, start + limit);
                const hasNext = start + limit < entries.length;

                return {
                    [responseKey]: slice,
                    meta: {
                        pagination: {
                            page,
                            pages: Math.ceil(entries.length / limit) || 1,
                            limit,
                            total: entries.length,
                            prev: page > 1 ? page - 1 : null,
                            next: hasNext ? page + 1 : null
                        }
                    }
                };
            };
        }

        return {
            pagesPublic: {browse: browse('pages', pageData)},
            postsPublic: {browse: browse('posts', postData)}
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
            urlUtils: opts.urlUtils || createFakeUrlUtils(),
            routing: opts.routing || createFakeRouting(),
            api: opts.api || createFakeApi(pages, posts, urlMap),
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

        const service = createService({
            pages: largePageData,
            posts: postData,
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

    it('limits llms-full.txt to the latest 500 posts', async function () {
        const posts = Array.from({length: 600}, (_, index) => ({
            id: `post-${index}`,
            title: `Post ${index}`,
            slug: `post-${index}`,
            plaintext: `Post ${index} body`,
            type: 'post'
        }));
        const urlMap = Object.fromEntries(posts.map(post => [
            post.id,
            `https://example.com/${post.slug}/`
        ]));

        const api = createFakeApi([], posts, urlMap);
        const postBrowseCalls = [];
        const browsePosts = api.postsPublic.browse;
        api.postsPublic.browse = (options) => {
            postBrowseCalls.push(options);
            return browsePosts(options);
        };

        const service = createService({api});

        const llmsFullTxt = await service.getLlmsFullTxt();

        assert.equal(postBrowseCalls.length, 5);
        assert.match(llmsFullTxt, /### Post 499/);
        assert.doesNotMatch(llmsFullTxt, /### Post 500/);
        assert.match(llmsFullTxt, /Includes the latest 500 public posts/);
        assert.match(llmsFullTxt, /Use `\/sitemap\.xml` for the complete archive of public content/);
    });

    it('computes fresh output on every call (no cache)', async function () {
        let callCount = 0;
        const countingBrowse = async () => {
            callCount += 1;
            return {posts: [], pages: [], meta: {pagination: {next: null}}};
        };
        const api = {
            pagesPublic: {browse: countingBrowse},
            postsPublic: {browse: countingBrowse}
        };

        const service = createService({api});

        await service.getLlmsTxt();
        await service.getLlmsTxt();

        assert.ok(callCount >= 4, `Expected at least 4 browse calls (2 per getLlmsTxt), got ${callCount}`);
    });

    it('does not request relations for llms.txt index entries', async function () {
        const calls = [];
        const recordingBrowse = async (options) => {
            calls.push(options);
            return {posts: [], pages: [], meta: {pagination: {next: null}}};
        };
        const api = {
            pagesPublic: {browse: recordingBrowse},
            postsPublic: {browse: recordingBrowse}
        };

        const service = createService({api});

        await service.getLlmsTxt();

        assert.equal(calls.length, 2);
        assert.equal(calls[0].include, undefined);
        assert.equal(calls[1].include, undefined);
    });

    it('does not request relations for llms-full.txt entries', async function () {
        const calls = [];
        const recordingBrowse = async (options) => {
            calls.push(options);
            return {posts: [], pages: [], meta: {pagination: {next: null}}};
        };
        const api = {
            pagesPublic: {browse: recordingBrowse},
            postsPublic: {browse: recordingBrowse}
        };

        const service = createService({api});

        await service.getLlmsFullTxt();

        assert.equal(calls.length, 2);
        assert.equal(calls[0].include, undefined);
        assert.equal(calls[1].include, undefined);
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

    it('fetches index content through the public Posts/Pages API, not the model layer', async function () {
        const calls = [];
        const recordingBrowse = key => async (options) => {
            calls.push({key, options});
            return {[key]: [], meta: {pagination: {next: null}}};
        };
        const api = {
            pagesPublic: {browse: recordingBrowse('pages')},
            postsPublic: {browse: recordingBrowse('posts')}
        };

        const service = createService({api});

        await service.getLlmsTxt();

        const pageCall = calls.find(call => call.key === 'pages');
        const postCall = calls.find(call => call.key === 'posts');

        assert.ok(pageCall, 'expected pagesPublic.browse to be called');
        assert.ok(postCall, 'expected postsPublic.browse to be called');
        assert.equal(pageCall.options.filter, 'status:published');
        assert.equal(postCall.options.filter, 'status:published');
        assert.equal(pageCall.options.limit, 20);
        assert.equal(postCall.options.limit, 100);
        assert.equal(pageCall.options.order, 'id asc');
        assert.equal(postCall.options.order, undefined);
        assert.deepEqual(pageCall.options.context, {member: null});
        assert.deepEqual(postCall.options.context, {member: null});
        assert.equal(postCall.options.formats, 'plaintext');
        assert.equal(postCall.options.fields, 'id,title,slug,custom_excerpt,featured,published_at,url');
    });

    it('requests narrow fields and html for llms-full.txt entries', async function () {
        const calls = [];
        const recordingBrowse = key => async (options) => {
            calls.push({key, options});
            return {[key]: [], meta: {pagination: {next: null}}};
        };
        const api = {
            pagesPublic: {browse: recordingBrowse('pages')},
            postsPublic: {browse: recordingBrowse('posts')}
        };

        const service = createService({api});

        await service.getLlmsFullTxt();

        const postCall = calls.find(call => call.key === 'posts');

        assert.ok(postCall, 'expected postsPublic.browse to be called');
        assert.equal(postCall.options.formats, 'html,plaintext');
        assert.equal(postCall.options.fields, 'id,title,slug,featured,published_at,updated_at,created_at,url,visibility,custom_excerpt');
        assert.equal(postCall.options.limit, 100);
    });

    it('includes the .md discoverability line and llms-full link in llms.txt', async function () {
        const service = createService({
            pages: [{id: 'page-a', title: 'About', slug: 'about', type: 'page'}],
            posts: [{id: 'post-a', title: 'Hello', slug: 'hello', type: 'post'}],
            urlMap: {
                'page-a': 'https://example.com/about/',
                'post-a': 'https://example.com/hello/'
            }
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /Append `\.md` to any post or page URL/);
        assert.match(llmsTxt, /## Optional[\s\S]*\[Full content of pages and posts\]\(http:\/\/127\.0\.0\.1:\d+\/llms-full\.txt\)/m);
    });

    it('includes the .md discoverability line in llms-full.txt', async function () {
        const service = createService({
            pages: [],
            posts: [{id: 'post-a', title: 'Hello', slug: 'hello', html: '<p>Body</p>', plaintext: 'Body', type: 'post'}],
            urlMap: {'post-a': 'https://example.com/hello/'}
        });

        const llmsFullTxt = await service.getLlmsFullTxt();

        assert.match(llmsFullTxt, /Append `\.md` to any post or page URL/);
    });

    it('keeps members-only posts in the llms.txt index with their public excerpt', async function () {
        const service = createService({
            pages: [],
            posts: [{
                id: 'post-m',
                title: 'Members Post',
                slug: 'members-post',
                custom_excerpt: 'Public teaser',
                plaintext: '',
                visibility: 'members',
                type: 'post'
            }],
            urlMap: {'post-m': 'https://example.com/members-post/'}
        });

        const llmsTxt = await service.getLlmsTxt();

        assert.match(llmsTxt, /\[Members Post\]\(https:\/\/example\.com\/members-post\.md\) - Public teaser/);
    });

    it('cuts members-only post bodies off in llms-full.txt with a subscriber notice', async function () {
        const service = createService({
            pages: [],
            posts: [
                {
                    id: 'post-m',
                    title: 'Members Post',
                    slug: 'members-post',
                    custom_excerpt: 'Public teaser',
                    html: '',
                    plaintext: '',
                    visibility: 'members',
                    type: 'post'
                },
                {
                    id: 'post-p',
                    title: 'Paid Post',
                    slug: 'paid-post',
                    html: '',
                    plaintext: '',
                    visibility: 'paid',
                    type: 'post'
                }
            ],
            urlMap: {
                'post-m': 'https://example.com/members-post/',
                'post-p': 'https://example.com/paid-post/'
            }
        });

        const llmsFullTxt = await service.getLlmsFullTxt();

        assert.match(llmsFullTxt, /### Members Post[\s\S]*Public teaser[\s\S]*This post is for subscribers only\./);
        assert.match(llmsFullTxt, /### Paid Post[\s\S]*This post is for paying subscribers only\./);
    });

    it('bounds the llms.txt index to the size budget', async function () {
        // ~2KB of excerpt per post; 1000 posts would be ~2MB unbounded, but the
        // index budget (~50KB) caps it well before that.
        const posts = Array.from({length: 1000}, (_, index) => ({
            id: `post-${index}`,
            title: `Post ${index}`,
            slug: `post-${index}`,
            custom_excerpt: 'x'.repeat(280),
            type: 'post'
        }));
        const urlMap = Object.fromEntries(posts.map(post => [
            post.id,
            `https://example.com/${post.slug}/`
        ]));

        const service = createService({pages: [], posts, urlMap});

        const llmsTxt = await service.getLlmsTxt();

        assert.ok(Buffer.byteLength(llmsTxt, 'utf8') <= 50 * 1024, `expected <= 50KB, got ${Buffer.byteLength(llmsTxt, 'utf8')}`);
        // Optional section is always retained even when posts fill the budget.
        assert.match(llmsTxt, /## Optional/);
        assert.match(llmsTxt, /\[Sitemap\]/);
    });
});
