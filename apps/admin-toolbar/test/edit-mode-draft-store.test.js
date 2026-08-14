import assert from 'node:assert/strict';
import {
    computeThemeContentHash,
    createMemoryDraftStore,
    draftKey
} from '../src/edit-mode/draft-store.js';

describe('edit-mode draft-store', function () {
    describe('computeThemeContentHash', function () {
        it('is stable for identical content regardless of key insertion order', function () {
            const a = computeThemeContentHash({'index.hbs': '<h1>Hi</h1>', 'post.hbs': '<p>{{title}}</p>'});
            const b = computeThemeContentHash({'post.hbs': '<p>{{title}}</p>', 'index.hbs': '<h1>Hi</h1>'});

            assert.equal(a, b);
            assert.match(a, /^[0-9a-f]{8}$/);
        });

        it('changes when any file content changes', function () {
            const base = computeThemeContentHash({'index.hbs': '<h1>Hi</h1>'});
            const edited = computeThemeContentHash({'index.hbs': '<h1>Hello</h1>'});

            assert.notEqual(base, edited);
        });

        it('changes when content moves between files', function () {
            const a = computeThemeContentHash({'a.hbs': 'x', 'b.hbs': ''});
            const b = computeThemeContentHash({'a.hbs': '', 'b.hbs': 'x'});

            assert.notEqual(a, b);
        });
    });

    describe('draftKey', function () {
        it('ties a draft to site, theme, and base content hash', function () {
            const key = draftKey({siteUrl: 'https://site.example.com/', themeName: 'casper', baseHash: 'abcd1234'});

            assert.equal(key, 'https://site.example.com/::casper::abcd1234');
        });
    });

    describe('createMemoryDraftStore (the DraftStore seam)', function () {
        it('implements the async get/set/list/clear interface', async function () {
            const store = createMemoryDraftStore();

            // every method is async — the seam contract a server-backed
            // implementation slots into
            assert.equal(await store.get('missing'), null);

            await store.set('key-1', {files: {'index.hbs': 'a'}, editCount: 1});
            await store.set('key-2', {files: {'index.hbs': 'b'}, editCount: 2});

            const draft = await store.get('key-1');
            assert.equal(draft.editCount, 1);
            assert.deepEqual(draft.files, {'index.hbs': 'a'});
            assert.equal(typeof draft.updatedAt, 'number');

            const listed = await store.list();
            assert.deepEqual(listed.map(entry => entry.key).sort(), ['key-1', 'key-2']);

            await store.clear('key-1');
            assert.equal(await store.get('key-1'), null);
            assert.notEqual(await store.get('key-2'), null);

            await store.clear();
            assert.deepEqual(await store.list(), []);
        });

        it('overwrites an existing draft on set and re-stamps updatedAt', async function () {
            const store = createMemoryDraftStore();

            await store.set('key', {files: {}, editCount: 1});
            await store.set('key', {files: {}, editCount: 5});

            const draft = await store.get('key');
            assert.equal(draft.editCount, 5);
        });
    });
});
