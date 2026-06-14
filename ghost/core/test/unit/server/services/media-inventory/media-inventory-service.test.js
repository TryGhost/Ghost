const assert = require('node:assert/strict');
const knex = require('knex').default;
const MediaInventoryService = require('../../../../../core/server/services/media-inventory/media-inventory-service');

const M = '__GHOST_URL__';

// Minimal urlUtils stand-in: the prefixes the extractor needs plus a simple
// transform-ready -> absolute conversion (mirrors a site at https://example.com).
const urlUtils = {
    STATIC_IMAGE_URL_PREFIX: 'content/images',
    STATIC_MEDIA_URL_PREFIX: 'content/media',
    STATIC_FILES_URL_PREFIX: 'content/files',
    transformReadyToAbsolute(url) {
        return url.replace(M, 'https://example.com');
    }
};

// These cover only what the extractor tests cannot: the SQL prefilter, the
// posts_meta join, page-vs-post handling, usage aggregation and the
// limit/meta semantics.
describe('MediaInventoryService', function () {
    let db;
    let service;

    beforeEach(async function () {
        db = knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
        service = new MediaInventoryService({knex: db, urlUtils});

        await db.schema.createTable('posts', function (table) {
            table.string('id');
            table.string('title');
            table.string('status');
            table.string('type');
            table.text('feature_image');
            table.text('lexical');
            table.text('mobiledoc');
            table.text('html');
        });
        await db.schema.createTable('posts_meta', function (table) {
            table.string('post_id');
            table.text('og_image');
            table.text('twitter_image');
        });
        await db.schema.createTable('posts_authors', function (table) {
            table.string('post_id');
            table.string('author_id');
        });
    });

    afterEach(async function () {
        await db.destroy();
    });

    async function insertPost(post = {}, meta = null) {
        await db('posts').insert({
            id: post.id,
            title: post.title ?? 'Untitled',
            status: post.status ?? 'published',
            type: post.type ?? 'post',
            feature_image: post.feature_image ?? null,
            lexical: post.lexical ?? null,
            mobiledoc: post.mobiledoc ?? null,
            html: post.html ?? null
        });
        if (meta) {
            await db('posts_meta').insert({post_id: post.id, ...meta});
        }
        if (post.authorId) {
            await db('posts_authors').insert({post_id: post.id, author_id: post.authorId});
        }
    }

    it('returns nothing when no post references site media', async function () {
        await insertPost({id: '1', lexical: '{"root":{"children":[]}}'});
        const result = await service.getInUseMedia();
        assert.deepEqual(result.data, []);
        assert.equal(result.meta.count, 0);
    });

    it('extracts feature and inline images and resolves them to absolute URLs', async function () {
        await insertPost({
            id: '1',
            feature_image: `${M}/content/images/2024/06/cover.jpg`,
            lexical: `{"src":"${M}/content/images/2024/06/inline.jpg"}`
        });

        const urls = (await service.getInUseMedia()).data.map(m => m.url).sort();
        assert.deepEqual(urls, [
            'https://example.com/content/images/2024/06/cover.jpg',
            'https://example.com/content/images/2024/06/inline.jpg'
        ]);
    });

    it('aggregates one image used across two posts and reports each use', async function () {
        const shared = `${M}/content/images/2024/06/shared.jpg`;
        await insertPost({id: '1', title: 'First', feature_image: shared});
        await insertPost({id: '2', title: 'Second', status: 'draft', lexical: `{"src":"${shared}"}`});

        const result = await service.getInUseMedia();
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].count, 2);

        const used = [...result.data[0].used_in].sort((a, b) => a.id.localeCompare(b.id));
        assert.deepEqual(used, [
            {type: 'post', id: '1', title: 'First', status: 'published', fields: ['feature_image']},
            {type: 'post', id: '2', title: 'Second', status: 'draft', fields: ['body']}
        ]);
    });

    it('counts a resource once but records every field that uses the image', async function () {
        const img = `${M}/content/images/2024/06/dup.jpg`;
        await insertPost({id: '1', feature_image: img, lexical: `{"src":"${img}"}`});

        const result = await service.getInUseMedia();
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].count, 1);
        assert.deepEqual([...result.data[0].used_in[0].fields].sort(), ['body', 'feature_image']);
    });

    it('reads posts_meta images and labels pages as pages', async function () {
        await insertPost(
            {id: '1', type: 'page'},
            {og_image: `${M}/content/images/2024/06/og.jpg`}
        );

        const result = await service.getInUseMedia();
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].used_in[0].type, 'page');
        assert.deepEqual(result.data[0].used_in[0].fields, ['og_image']);
        assert.equal(result.data[0].url, 'https://example.com/content/images/2024/06/og.jpg');
    });

    it('filters by type', async function () {
        await insertPost({
            id: '1',
            feature_image: `${M}/content/images/2024/06/pic.jpg`,
            lexical: `{"a":"${M}/content/media/2024/06/clip.mp4"}`
        });

        const result = await service.getInUseMedia({type: 'media'});
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].type, 'media');
    });

    it('scopes the scan to one author when authorId is supplied', async function () {
        await insertPost({id: '1', authorId: 'author-1', feature_image: `${M}/content/images/mine.jpg`});
        await insertPost({id: '2', authorId: 'author-2', feature_image: `${M}/content/images/theirs.jpg`});

        const scoped = await service.getInUseMedia({authorId: 'author-1'});
        assert.deepEqual(scoped.data.map(m => m.url), ['https://example.com/content/images/mine.jpg']);
        assert.equal(scoped.meta.count, 1);

        // Without a scope, every post's media is returned (elevated roles).
        const all = await service.getInUseMedia();
        assert.equal(all.data.length, 2);
    });

    it('applies limit to data while meta.count keeps the true total', async function () {
        await insertPost({id: '1', feature_image: `${M}/content/images/a.jpg`});
        await insertPost({id: '2', feature_image: `${M}/content/images/b.jpg`});
        await insertPost({id: '3', feature_image: `${M}/content/images/c.jpg`});

        const result = await service.getInUseMedia({limit: 2});
        assert.equal(result.data.length, 2);
        assert.equal(result.meta.count, 3);
    });
});
