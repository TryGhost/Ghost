require('should');

const UrlHistory = require('../lib/UrlHistory');
const AttributionBuilder = require('../lib/AttributionBuilder');

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
        should(await attributionBuilder.getAttribution(history)).match({id: null, type: null, url: null, referrerSource: null, referrerMedium: null, referrerUrl: null});
    });

    it('Returns last url', async function () {
        const history = UrlHistory.create([{path: '/dir/not-last', time: now + 123}, {path: '/dir/test/', time: now + 123}]);
        should(await attributionBuilder.getAttribution(history)).match({type: 'url', id: null, url: '/test/'});
    });

    it('Returns last post', async function () {
        const history = UrlHistory.create([
            {path: '/dir/my-post', time: now + 123},
            {path: '/dir/test', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(await attributionBuilder.getAttribution(history)).match({type: 'post', id: 123, url: '/my-post'});
    });

    it('Returns last post even when it found pages', async function () {
        const history = UrlHistory.create([
            {path: '/dir/my-post', time: now + 123},
            {path: '/dir/my-page', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(await attributionBuilder.getAttribution(history)).match({type: 'post', id: 123, url: '/my-post'});
    });

    it('Returns last page if no posts', async function () {
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {path: '/dir/my-page', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(await attributionBuilder.getAttribution(history)).match({type: 'page', id: 845, url: '/my-page'});
    });

    it('Returns last post via id', async function () {
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {id: '123', type: 'post', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(await attributionBuilder.getAttribution(history)).match({type: 'post', id: '123', url: '/post/123'});
    });

    it('Returns referrer attribution', async function () {
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {id: '123', type: 'post', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(await attributionBuilder.getAttribution(history)).match({
            referrerSource: 'Ghost Explore',
            referrerMedium: 'Ghost Network',
            referrerUrl: 'https://ghost.org/explore'
        });
    });

    it('Returns all null if only invalid ids', async function () {
        const history = UrlHistory.create([
            {id: 'invalid', type: 'post', time: now + 124},
            {id: 'invalid', type: 'post', time: now + 124}
        ]);
        should(await attributionBuilder.getAttribution(history)).match({
            type: null,
            id: null,
            url: null,
            referrerSource: 'Ghost Explore',
            referrerMedium: 'Ghost Network',
            referrerUrl: 'https://ghost.org/explore'
        });
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
        should(await attributionBuilder.getAttribution(history)).match({
            referrerSource: null,
            referrerMedium: null,
            referrerUrl: null
        });
    });

    it('Returns all null for invalid histories', async function () {
        const history = UrlHistory.create('invalid');
        should(await attributionBuilder.getAttribution(history)).match({
            type: null,
            id: null,
            url: null
        });
    });

    it('Returns all null for empty histories', async function () {
        const history = UrlHistory.create([]);
        should(await attributionBuilder.getAttribution(history)).match({
            type: null,
            id: null,
            url: null
        });
    });

    it('Returns post resource', async function () {
        should(await attributionBuilder.build({type: 'post', id: '123', url: '/post'}).fetchResource()).match({
            type: 'post',
            id: '123',
            url: 'https://absolute/dir/path',
            title: 'title'
        });
    });

    it('Returns author resource', async function () {
        should(await attributionBuilder.build({type: 'author', id: '123', url: '/author'}).fetchResource()).match({
            type: 'author',
            id: '123',
            url: 'https://absolute/dir/path',
            title: 'name'
        });
    });

    it('Returns default url title for resource if no title or name', async function () {
        should(await attributionBuilder.build({type: 'post', id: 'no-props', url: '/post'}).fetchResource()).match({
            type: 'post',
            id: 'no-props',
            url: 'https://absolute/dir/path',
            title: '/post'
        });
    });

    it('Returns url resource', async function () {
        should(await attributionBuilder.build({type: 'url', id: null, url: '/url'}).fetchResource()).match({
            type: 'url',
            id: null,
            url: 'https://absolute/dir/url',
            title: '/url'
        });
    });

    it('Returns url resource if not found', async function () {
        should(await attributionBuilder.build({type: 'post', id: 'invalid', url: '/post'}).fetchResource()).match({
            type: 'url',
            id: null,
            url: 'https://absolute/dir/post',
            title: '/post'
        });
    });
});
