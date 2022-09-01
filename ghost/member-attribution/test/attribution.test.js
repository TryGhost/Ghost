// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const UrlHistory = require('../lib/history');
const AttributionBuilder = require('../lib/attribution');

describe('AttributionBuilder', function () {
    let attributionBuilder;
    let now;

    before(function () {
        now = Date.now();
        attributionBuilder = new AttributionBuilder({
            urlTranslator: {
                getTypeAndId(path) {
                    if (path === '/my-post') {
                        return {
                            id: 123,
                            type: 'post'
                        };
                    }
                    if (path === '/my-page') {
                        return {
                            id: 845,
                            type: 'page'
                        };
                    }
                    return;
                },
                getResourceById(id) {
                    if (id === 'invalid') {
                        return null;
                    }
                    return {
                        id,
                        get() {
                            return 'Title';
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
            }
        });
    });

    it('Returns empty if empty history', function () {
        const history = UrlHistory.create([]);
        should(attributionBuilder.getAttribution(history)).match({id: null, type: null, url: null});
    });

    it('Returns last url', function () {
        const history = UrlHistory.create([{path: '/dir/not-last', time: now + 123}, {path: '/dir/test/', time: now + 123}]);
        should(attributionBuilder.getAttribution(history)).match({type: 'url', id: null, url: '/test/'});
    });

    it('Returns last post', function () {
        const history = UrlHistory.create([
            {path: '/dir/my-post', time: now + 123},
            {path: '/dir/test', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(attributionBuilder.getAttribution(history)).match({type: 'post', id: 123, url: '/my-post'});
    });

    it('Returns last post even when it found pages', function () {
        const history = UrlHistory.create([
            {path: '/dir/my-post', time: now + 123},
            {path: '/dir/my-page', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(attributionBuilder.getAttribution(history)).match({type: 'post', id: 123, url: '/my-post'});
    });

    it('Returns last page if no posts', function () {
        const history = UrlHistory.create([
            {path: '/dir/other', time: now + 123},
            {path: '/dir/my-page', time: now + 124},
            {path: '/dir/unknown-page', time: now + 125}
        ]);
        should(attributionBuilder.getAttribution(history)).match({type: 'page', id: 845, url: '/my-page'});
    });

    it('Returns all null for invalid histories', function () {
        const history = UrlHistory.create('invalid');
        should(attributionBuilder.getAttribution(history)).match({
            type: null,
            id: null,
            url: null
        });
    });

    it('Returns all null for empty histories', function () {
        const history = UrlHistory.create([]);
        should(attributionBuilder.getAttribution(history)).match({
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
            title: 'Title'
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
