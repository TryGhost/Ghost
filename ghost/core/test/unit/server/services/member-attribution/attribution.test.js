const assert = require('node:assert/strict');

const UrlHistory = require('../../../../../core/server/services/member-attribution/url-history');
const AttributionBuilder = require('../../../../../core/server/services/member-attribution/attribution-builder');

describe('AttributionBuilder', function () {
    let attributionBuilder;
    let urlTranslator;
    let now;

    before(function () {
        now = Date.now();
        urlTranslator = {
            getResourceDetails(item) {
                if (!item.path) {
                    if (item.id === 'invalid') {
                        return null;
                    }

                    return {
                        id: item.id,
                        type: item.type,
                        url: `/${item.type}/${item.id}`
                    };
                }

                const path = this.stripSubdirectoryFromPath(item.path);

                if (path === '/my-post') {
                    return {
                        id: 123,
                        type: 'post',
                        url: path
                    };
                }
                if (path === '/my-page') {
                    return {
                        id: 845,
                        type: 'page',
                        url: path
                    };
                }
                return {
                    id: null,
                    type: 'url',
                    url: path
                };
            },
            getResourceById(id, type) {
                if (id === 'invalid') {
                    return null;
                }
                return {
                    id,
                    get(prop) {
                        if (prop === 'title' && type === 'author') {
                            // Simulate an author doesn't have a title
                            return undefined;
                        }
                        if (id === 'no-props') {
                            // Simulate a model without properties for branch coverage
                            return undefined;
                        }
                        return prop;
                    }
                };
            },
            getUrlTitle(url) {
                return url;
            },
            getUrlByResourceId() {
                return 'https://absolute/dir/path';
            },
            relativeToAbsolute(path) {
                return 'https://absolute/dir' + path;
            },
            stripSubdirectoryFromPath(path) {
                if (path.startsWith('/dir/')) {
                    return path.substring('/dir/'.length - 1);
                }
                return path;
            }
        };
        attributionBuilder = new AttributionBuilder({
            urlTranslator,
            referrerTranslator: {
                getReferrerDetails(history) {
                    if (history) {
                        return {
                            referrerSource: 'Ghost Explore',
                            referrerMedium: 'Ghost Network',
                            referrerUrl: 'https://ghost.org/explore'
                        };
                    }
                    return null;
                }
            }
        });
    });

    it('Returns empty if empty history', async function () {
        const history = UrlHistory.create([]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.id, null);
        assert.equal(result.type, null);
        assert.equal(result.url, null);
        assert.equal(result.referrerSource, null);
        assert.equal(result.referrerMedium, null);
        assert.equal(result.referrerUrl, null);
    });

    it('Returns last url', async function () {
        const history = UrlHistory.create([{path: '/dir/not-last', time: now + 123}, {path: '/dir/test/', time: now + 123}]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, 'url');
        assert.equal(result.id, null);
        assert.equal(result.url, '/test/');
    });

    it('Returns last post', async function () {
        const history = UrlHistory.create([
            {path: '/dir/my-post', time: now + 123},
            {path: '/dir/test', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, 'post');
        assert.equal(result.id, 123);
        assert.equal(result.url, '/my-post');
    });

    it('Returns last post even when it found pages', async function () {
        const history = UrlHistory.create([
            {path: '/dir/my-post', time: now + 123},
            {path: '/dir/my-page', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, 'post');
        assert.equal(result.id, 123);
        assert.equal(result.url, '/my-post');
    });

    it('Returns last page if no posts', async function () {
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {path: '/dir/my-page', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, 'page');
        assert.equal(result.id, 845);
        assert.equal(result.url, '/my-page');
    });

    it('Returns last post via id', async function () {
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {id: '123', type: 'post', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, 'post');
        assert.equal(result.id, '123');
        assert.equal(result.url, '/post/123');
    });

    it('Returns referrer attribution', async function () {
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {id: '123', type: 'post', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.referrerSource, 'Ghost Explore');
        assert.equal(result.referrerMedium, 'Ghost Network');
        assert.equal(result.referrerUrl, 'https://ghost.org/explore');
    });

    it('Returns all null if only invalid ids', async function () {
        const history = UrlHistory.create([
            {id: 'invalid', type: 'post', time: now + 124},
            {id: 'invalid', type: 'post', time: now + 124}
        ]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, null);
        assert.equal(result.id, null);
        assert.equal(result.url, null);
        assert.equal(result.referrerSource, 'Ghost Explore');
        assert.equal(result.referrerMedium, 'Ghost Network');
        assert.equal(result.referrerUrl, 'https://ghost.org/explore');
    });

    it('Returns null referrer attribution', async function () {
        attributionBuilder = new AttributionBuilder({
            urlTranslator,
            referrerTranslator: {
                getReferrerDetails() {
                    return null;
                }
            }
        });
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {id: '123', type: 'post', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.referrerSource, null);
        assert.equal(result.referrerMedium, null);
        assert.equal(result.referrerUrl, null);
    });

    it('Returns all null for invalid histories', async function () {
        const history = UrlHistory.create('invalid');
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, null);
        assert.equal(result.id, null);
        assert.equal(result.url, null);
    });

    it('Returns all null for empty histories', async function () {
        const history = UrlHistory.create([]);
        const result = await attributionBuilder.getAttribution(history);
        assert.equal(result.type, null);
        assert.equal(result.id, null);
        assert.equal(result.url, null);
    });

    it('Returns post resource', async function () {
        const result = await attributionBuilder.build({type: 'post', id: '123', url: '/post'}).fetchResource();
        assert.equal(result.type, 'post');
        assert.equal(result.id, '123');
        assert.equal(result.url, 'https://absolute/dir/path');
        assert.equal(result.title, 'title');
    });

    it('Returns author resource', async function () {
        const result = await attributionBuilder.build({type: 'author', id: '123', url: '/author'}).fetchResource();
        assert.equal(result.type, 'author');
        assert.equal(result.id, '123');
        assert.equal(result.url, 'https://absolute/dir/path');
        assert.equal(result.title, 'name');
    });

    it('Returns default url title for resource if no title or name', async function () {
        const result = await attributionBuilder.build({type: 'post', id: 'no-props', url: '/post'}).fetchResource();
        assert.equal(result.type, 'post');
        assert.equal(result.id, 'no-props');
        assert.equal(result.url, 'https://absolute/dir/path');
        assert.equal(result.title, '/post');
    });

    it('Returns url resource', async function () {
        const result = await attributionBuilder.build({type: 'url', id: null, url: '/url'}).fetchResource();
        assert.equal(result.type, 'url');
        assert.equal(result.id, null);
        assert.equal(result.url, 'https://absolute/dir/url');
        assert.equal(result.title, '/url');
    });

    it('Returns url resource if not found', async function () {
        const result = await attributionBuilder.build({type: 'post', id: 'invalid', url: '/post'}).fetchResource();
        assert.equal(result.type, 'url');
        assert.equal(result.id, null);
        assert.equal(result.url, 'https://absolute/dir/post');
        assert.equal(result.title, '/post');
    });
});
