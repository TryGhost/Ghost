const assert = require('node:assert/strict');
const shared = require('../');

describe('Frame', function () {
    it('constructor', function () {
        const frame = new shared.Frame();
        assert.deepEqual(Object.keys(frame), [
            'original',
            'options',
            'data',
            'user',
            'file',
            'files',
            'apiType',
            'docName',
            'method',
            'response'
        ]);
    });

    describe('fn: configure', function () {
        it('no transform', function () {
            const original = {
                context: {user: 'id'},
                body: {posts: []},
                params: {id: 'id'},
                query: {include: 'tags', filter: 'type:post', soup: 'yumyum'}
            };

            const frame = new shared.Frame(original);

            frame.configure({});

            assert.ok(frame.options.context.user);
            assert.equal(frame.options.include, undefined);
            assert.equal(frame.options.filter, undefined);
            assert.equal(frame.options.id, undefined);
            assert.equal(frame.options.soup, undefined);

            assert.ok(frame.data.posts);
        });

        it('transform with query', function () {
            const original = {
                context: {user: 'id'},
                body: {posts: []},
                params: {id: 'id'},
                query: {include: 'tags', filter: 'type:post', soup: 'yumyum'}
            };

            const frame = new shared.Frame(original);

            frame.configure({
                options: ['include', 'filter', 'id']
            });

            assert.ok(frame.options.context.user);
            assert.ok(frame.options.include);
            assert.ok(frame.options.filter);
            assert.ok(frame.options.id);
            assert.equal(frame.options.soup, undefined);

            assert.ok(frame.data.posts);
        });

        it('transform', function () {
            const original = {
                context: {user: 'id'},
                options: {
                    slug: 'slug'
                }
            };

            const frame = new shared.Frame(original);

            frame.configure({
                options: ['include', 'filter', 'slug']
            });

            assert.ok(frame.options.context.user);
            assert.ok(frame.options.slug);
        });

        it('transform with data', function () {
            const original = {
                context: {user: 'id'},
                options: {
                    id: 'id'
                },
                body: {}
            };

            const frame = new shared.Frame(original);

            frame.configure({
                data: ['id']
            });

            assert.ok(frame.options.context.user);
            assert.equal(frame.options.id, undefined);
            assert.ok(frame.data.id);
        });

        it('supports options/data selectors as functions', function () {
            const original = {
                context: {user: 'id'},
                query: {include: 'tags'},
                params: {slug: 'abc'},
                options: {id: 'id'}
            };

            const frame = new shared.Frame(original);

            frame.configure({
                options() {
                    return ['include', 'slug'];
                },
                data() {
                    return ['slug', 'id'];
                }
            });

            assert.equal(frame.options.include, 'tags');
            assert.equal(frame.options.slug, 'abc');
            assert.equal(frame.data.slug, 'abc');
            assert.equal(frame.data.id, 'id');
        });
    });

    describe('headers', function () {
        it('sets and returns copied headers', function () {
            const frame = new shared.Frame();
            frame.setHeader('X-Test', '1');

            const headers = frame.getHeaders();
            assert.deepEqual(headers, {'X-Test': '1'});

            headers['X-Test'] = '2';
            assert.deepEqual(frame.getHeaders(), {'X-Test': '1'});
        });
    });
});
