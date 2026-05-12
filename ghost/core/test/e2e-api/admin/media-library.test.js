const assert = require('node:assert/strict');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const crypto = require('crypto');
const ObjectId = require('bson-objectid').default;
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const db = require('../../../core/server/data/db');
const config = require('../../../core/shared/config');
const permissions = require('../../../core/server/services/permissions');

async function ensureMediaPermissions() {
    const now = new Date();
    const mediaPermissions = [
        {name: 'Browse media', action_type: 'browse', object_type: 'media'},
        {name: 'Read media', action_type: 'read', object_type: 'media'},
        {name: 'Edit media', action_type: 'edit', object_type: 'media'}
    ];

    for (const mediaPermission of mediaPermissions) {
        let permission = await db.knex('permissions').where({name: mediaPermission.name}).first();

        if (!permission) {
            permission = {
                id: ObjectId().toHexString(),
                object_id: null,
                created_at: now,
                updated_at: now,
                ...mediaPermission
            };
            await db.knex('permissions').insert(permission);
        }

        const roles = await db.knex('roles').whereIn('name', ['Editor', 'Administrator', 'Owner']);
        for (const role of roles) {
            const existing = await db.knex('permissions_roles').where({
                permission_id: permission.id,
                role_id: role.id
            }).first();

            if (!existing) {
                await db.knex('permissions_roles').insert({
                    id: ObjectId().toHexString(),
                    permission_id: permission.id,
                    role_id: role.id
                });
            }
        }
    }

    await permissions.init();
}

describe('Media Library API', function () {
    let agent;
    let prefix;
    let backfillPath;
    let uploadedPath;
    let uploadedFolderPath;
    let remotePostId;
    let unsplashPostId;
    let tenorPostId;
    let metaPostId;
    let usagePostId;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await ensureMediaPermissions();
        await agent.loginAsOwner();

        prefix = `media-library-v1-${Date.now()}`;
        backfillPath = path.join(config.get('paths:contentPath'), 'images', '2026', '05', `${prefix}-backfill.jpg`);
        await fs.ensureDir(path.dirname(backfillPath));
        await fs.copy(path.join(__dirname, '../../utils/fixtures/images/ghosticon.jpg'), backfillPath);

        remotePostId = ObjectId().toHexString();
        await db.knex('posts').insert({
            id: remotePostId,
            uuid: crypto.randomUUID(),
            title: `${prefix} Remote image post`,
            slug: `${prefix}-remote-image-post`,
            mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[]}',
            lexical: '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
            html: '',
            plaintext: '',
            feature_image: `https://images.example.com/${prefix}-remote-feature?fm=jpg&w=1200`,
            type: 'post',
            status: 'published',
            visibility: 'public',
            email_recipient_filter: '',
            created_at: new Date(),
            updated_at: new Date(),
            published_at: new Date()
        });

        unsplashPostId = ObjectId().toHexString();
        await db.knex('posts').insert({
            id: unsplashPostId,
            uuid: crypto.randomUUID(),
            title: `${prefix} Unsplash image post`,
            slug: `${prefix}-unsplash-image-post`,
            mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[]}',
            lexical: '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
            html: '',
            plaintext: '',
            feature_image: `https://images.unsplash.com/${prefix}-unsplash-feature?fm=jpg&w=1200`,
            type: 'post',
            status: 'published',
            visibility: 'public',
            email_recipient_filter: '',
            created_at: new Date(),
            updated_at: new Date(),
            published_at: new Date()
        });

        tenorPostId = ObjectId().toHexString();
        await db.knex('posts').insert({
            id: tenorPostId,
            uuid: crypto.randomUUID(),
            title: `${prefix} Tenor GIF post`,
            slug: `${prefix}-tenor-gif-post`,
            mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[]}',
            lexical: '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
            html: `<figure><img src="https://media.tenor.com/${prefix}-tenor.gif" alt="Tenor GIF"></figure>`,
            plaintext: '',
            feature_image: null,
            type: 'post',
            status: 'published',
            visibility: 'public',
            email_recipient_filter: '',
            created_at: new Date(),
            updated_at: new Date(),
            published_at: new Date()
        });

        metaPostId = ObjectId().toHexString();
        await db.knex('posts').insert({
            id: metaPostId,
            uuid: crypto.randomUUID(),
            title: `${prefix} Meta image post`,
            slug: `${prefix}-meta-image-post`,
            mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[]}',
            lexical: '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
            html: '',
            plaintext: '',
            feature_image: null,
            type: 'post',
            status: 'published',
            visibility: 'public',
            email_recipient_filter: '',
            created_at: new Date(),
            updated_at: new Date(),
            published_at: new Date()
        });
        await db.knex('posts_meta').insert({
            id: ObjectId().toHexString(),
            post_id: metaPostId,
            og_image: `https://images.example.com/${prefix}-meta-og.jpg`,
            email_only: false
        });
    });

    after(async function () {
        if (prefix) {
            await db.knex('media_folders').where('name', 'like', `${prefix}%`).del();
            await db.knex('media_file_usages').whereIn('media_file_id', function () {
                this.select('id').from('media_files').where('name', 'like', `${prefix}%`);
            }).del();
            await db.knex('media_files').where('name', 'like', `${prefix}%`).del();
        }

        if (remotePostId) {
            await db.knex('posts').where({id: remotePostId}).del();
        }

        if (unsplashPostId) {
            await db.knex('posts').where({id: unsplashPostId}).del();
        }

        if (tenorPostId) {
            await db.knex('posts').where({id: tenorPostId}).del();
        }

        if (metaPostId) {
            await db.knex('posts_meta').where({post_id: metaPostId}).del();
            await db.knex('posts').where({id: metaPostId}).del();
        }

        if (usagePostId) {
            await db.knex('posts').where({id: usagePostId}).del();
        }

        if (backfillPath) {
            await fs.remove(backfillPath);
        }

        if (uploadedPath) {
            await fs.remove(config.get('paths').appRoot + uploadedPath);
        }

        if (uploadedFolderPath) {
            await fs.remove(config.get('paths').appRoot + uploadedFolderPath);
        }
    });

    async function insertMedia(overrides) {
        const now = new Date();
        const media = {
            id: ObjectId().toHexString(),
            url: `https://example.com/content/images/${prefix}-${ObjectId().toHexString()}.jpg`,
            url_hash: null,
            folder_id: null,
            storage_path: null,
            storage_type: 'images',
            media_type: 'image',
            mime_type: 'image/jpeg',
            extension: 'jpg',
            name: `${prefix}-image`,
            size_bytes: 1234,
            width: 100,
            height: 100,
            thumbnail_url: null,
            source: 'upload',
            created_by: null,
            created_at: now,
            updated_at: now,
            ...overrides
        };
        media.url_hash = crypto.createHash('sha256').update(media.url).digest('hex');

        await db.knex('media_files').insert(media);
        return media;
    }

    it('allows editors and blocks authors', async function () {
        await insertMedia({name: `${prefix}-permissions`});

        await agent.loginAsEditor();
        await agent
            .get(`media/?search=${prefix}-permissions`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-permissions`);
            });

        await agent.loginAsAuthor();
        await agent
            .get(`media/?search=${prefix}-permissions`)
            .expectStatus(403);

        await agent.loginAsOwner();
    });

    it('supports pagination, search, filter, and order', async function () {
        const collectionPrefix = `${prefix}-collection`;

        await insertMedia({
            name: `${collectionPrefix}-alpha`,
            media_type: 'image',
            source: 'upload',
            created_at: new Date('2026-01-01T00:00:00.000Z')
        });
        await insertMedia({
            name: `${collectionPrefix}-beta`,
            storage_type: 'files',
            media_type: 'file',
            mime_type: 'application/pdf',
            extension: 'pdf',
            source: 'external',
            created_at: new Date('2026-01-02T00:00:00.000Z')
        });
        await insertMedia({
            name: `${collectionPrefix}-gamma`,
            storage_type: 'media',
            media_type: 'video',
            mime_type: 'video/mp4',
            extension: 'mp4',
            source: 'upload',
            created_at: new Date('2026-01-03T00:00:00.000Z')
        });
        await insertMedia({
            name: `${collectionPrefix}-delta`,
            storage_type: 'files',
            media_type: 'file',
            mime_type: 'text/plain',
            extension: 'txt',
            source: 'external',
            created_at: new Date('2026-01-04T00:00:00.000Z')
        });

        await agent
            .get(`media/?search=${collectionPrefix}&order=${encodeURIComponent('name asc')}&limit=2`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.deepEqual(body.media.map(item => item.name), [`${collectionPrefix}-alpha`, `${collectionPrefix}-beta`]);
                assert.equal(body.meta.pagination.total, 4);
                assert.equal(body.meta.pagination.next, 2);
            });

        await agent
            .get(`media/?search=${collectionPrefix}&filter=${encodeURIComponent('source:upload')}&order=${encodeURIComponent('created_at desc')}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.deepEqual(body.media.map(item => item.name), [`${collectionPrefix}-gamma`, `${collectionPrefix}-alpha`]);
            });

        await agent
            .get(`media/?search=${collectionPrefix}&filter=${encodeURIComponent('media_type:file')}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 2);
            });

        await agent
            .get(`media/?search=${collectionPrefix}&filter=${encodeURIComponent('media_type:file+extension:pdf')}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.deepEqual(body.media.map(item => item.name), [`${collectionPrefix}-beta`]);
            });

        await agent
            .get(`media/?search=${collectionPrefix}&filter=${encodeURIComponent('media_type:file+extension:-pdf')}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.deepEqual(body.media.map(item => item.name), [`${collectionPrefix}-delta`]);
            });
    });

    it('reads a single media file with usage rows', async function () {
        const media = await insertMedia({name: `${prefix}-with-usage`});
        usagePostId = ObjectId().toHexString();

        await db.knex('posts').insert({
            id: usagePostId,
            uuid: crypto.randomUUID(),
            title: `${prefix} Usage post`,
            slug: `${prefix}-usage-post`,
            mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[]}',
            lexical: '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
            html: '',
            plaintext: '',
            feature_image: media.url,
            type: 'post',
            status: 'draft',
            visibility: 'public',
            email_recipient_filter: '',
            created_at: new Date(),
            updated_at: new Date()
        });

        await db.knex('media_file_usages').insert({
            id: ObjectId().toHexString(),
            media_file_id: media.id,
            resource_type: 'post',
            resource_id: usagePostId,
            field: 'feature_image',
            created_at: new Date()
        });

        await agent
            .get(`media/${media.id}/`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].id, media.id);
                assert.equal(body.media[0].usages.length, 1);
                assert.equal(body.media[0].usages[0].field, 'feature_image');
                assert.equal(body.media[0].usages[0].resource.title, `${prefix} Usage post`);
                assert.equal(body.media[0].usages[0].resource.type, 'post');
                assert.equal(body.media[0].usages[0].resource.editor_url, `/editor/post/${usagePostId}`);
            });
    });

    it('blocks deleting media with tracked usage', async function () {
        const media = await insertMedia({name: `${prefix}-delete-used`});

        await db.knex('media_file_usages').insert({
            id: ObjectId().toHexString(),
            media_file_id: media.id,
            resource_type: 'post',
            resource_id: remotePostId,
            field: 'feature_image',
            created_at: new Date()
        });

        await agent
            .delete(`media/${media.id}/`)
            .expectStatus(400);

        const existing = await db.knex('media_files').where({id: media.id}).first();
        assert.ok(existing);
    });

    it('deletes unused media files', async function () {
        const media = await insertMedia({name: `${prefix}-delete-unused`});

        await agent
            .delete(`media/${media.id}/`)
            .expectStatus(204);

        const existing = await db.knex('media_files').where({id: media.id}).first();
        assert.equal(existing, undefined);
    });

    it('edits media metadata without changing storage fields', async function () {
        const media = await insertMedia({
            name: `${prefix}-metadata`,
            storage_path: `2026/05/${prefix}-metadata.jpg`
        });

        await agent
            .put(`media/${media.id}/`)
            .body({
                media: [{
                    name: `${prefix}-renamed.jpg`,
                    alt_text: 'A useful description',
                    caption: 'A visible caption',
                    url: 'https://example.com/changed.jpg',
                    storage_path: 'changed.jpg',
                    storage_type: 'files'
                }]
            })
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media[0].name, `${prefix}-renamed`);
                assert.equal(body.media[0].alt_text, 'A useful description');
                assert.equal(body.media[0].caption, 'A visible caption');
                assert.equal(body.media[0].url, media.url);
                assert.equal(body.media[0].storage_path, media.storage_path);
                assert.equal(body.media[0].storage_type, media.storage_type);
            });
    });

    it('creates folders and filters media by folder', async function () {
        const media = await insertMedia({name: `${prefix}-foldered`});

        const folderResponse = await agent
            .post('media/folders/')
            .body({
                media_folders: [{
                    name: `${prefix} Brand`
                }]
            })
            .expectStatus(201);

        const folder = folderResponse.body.media_folders[0];
        assert.equal(folder.name, `${prefix} Brand`);

        await agent
            .put(`media/${media.id}/`)
            .body({
                media: [{
                    folder_id: folder.id
                }]
            })
            .expectStatus(200);

        await agent
            .get(`media/?filter=${encodeURIComponent(`folder_id:${folder.id}`)}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].id, media.id);
                assert.equal(body.media[0].folder_id, folder.id);
            });

        await agent
            .delete(`media/folders/${folder.id}/`)
            .expectStatus(204);

        const updated = await db.knex('media_files').where({id: media.id}).first();
        assert.equal(updated.folder_id, null);
    });

    it('indexes local content files before browsing', async function () {
        await agent
            .get(`media/?search=${prefix}-backfill`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-backfill`);
                assert.equal(body.media[0].source, 'upload');
                assert.equal(body.media[0].media_type, 'image');
            });
    });

    it('tracks generic external image references from posts', async function () {
        await agent
            .get(`media/?search=${prefix}-remote-feature`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-remote-feature`);
                assert.equal(body.media[0].url, `https://images.example.com/${prefix}-remote-feature?fm=jpg&w=1200`);
                assert.equal(body.media[0].source, 'external');
                assert.equal(body.media[0].storage_type, 'images');
                assert.equal(body.media[0].media_type, 'image');
            });

        await agent
            .get(`media/?search=${prefix}-remote-feature&filter=${encodeURIComponent('source:external')}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].source, 'external');
            });

        const usage = await db.knex('media_file_usages')
            .where({
                resource_type: 'post',
                resource_id: remotePostId,
                field: 'feature_image'
            })
            .first();

        assert.ok(usage);
    });

    it('tracks post metadata image usage against the post id', async function () {
        await agent
            .get(`media/?search=${prefix}-meta-og`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-meta-og`);
                assert.equal(body.media[0].source, 'external');
            });

        const usage = await db.knex('media_file_usages')
            .where({
                resource_type: 'post',
                resource_id: metaPostId,
                field: 'og_image'
            })
            .first();

        assert.ok(usage);
    });

    it('tracks Unsplash as a media source', async function () {
        await agent
            .get(`media/?search=${prefix}-unsplash-feature`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-unsplash-feature`);
                assert.equal(body.media[0].url, `https://images.unsplash.com/${prefix}-unsplash-feature?fm=jpg&w=1200`);
                assert.equal(body.media[0].source, 'unsplash');
                assert.equal(body.media[0].storage_type, 'images');
                assert.equal(body.media[0].media_type, 'image');
            });

        await agent
            .get(`media/?search=${prefix}-unsplash-feature&filter=${encodeURIComponent('source:unsplash')}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].source, 'unsplash');
            });
    });

    it('tracks Tenor GIFs in post content as a media source', async function () {
        await agent
            .get(`media/?search=${prefix}-tenor`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-tenor`);
                assert.equal(body.media[0].url, `https://media.tenor.com/${prefix}-tenor.gif`);
                assert.equal(body.media[0].source, 'tenor');
                assert.equal(body.media[0].storage_type, 'images');
                assert.equal(body.media[0].media_type, 'image');
                assert.equal(body.media[0].extension, 'gif');
            });

        await agent
            .get(`media/?search=${prefix}-tenor&filter=${encodeURIComponent('source:tenor')}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].source, 'tenor');
            });

        const usage = await db.knex('media_file_usages')
            .where({
                resource_type: 'post',
                resource_id: tenorPostId,
                field: 'html'
            })
            .first();

        assert.ok(usage);
    });

    it('indexes files uploaded through existing upload endpoints', async function () {
        const form = new FormData();
        form.append('file', await fs.readFile(path.join(__dirname, '../../utils/fixtures/images/ghosticon.jpg')), {
            filename: `${prefix}-upload.jpg`,
            contentType: 'image/jpeg'
        });
        form.append('purpose', 'image');

        const upload = await agent
            .post('images/upload/')
            .body(form)
            .expectStatus(201);

        uploadedPath = new URL(upload.body.images[0].url).pathname;

        await agent
            .get(`media/?search=${prefix}-upload`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-upload`);
                assert.equal(body.media[0].source, 'upload');
                assert.equal(body.media[0].storage_type, 'images');
            });
    });

    it('indexes uploads into the selected folder', async function () {
        const folderResponse = await agent
            .post('media/folders/')
            .body({
                media_folders: [{
                    name: `${prefix} Uploads`
                }]
            })
            .expectStatus(201);
        const folder = folderResponse.body.media_folders[0];

        const form = new FormData();
        form.append('file', await fs.readFile(path.join(__dirname, '../../utils/fixtures/images/ghosticon.jpg')), {
            filename: `${prefix}-folder-upload.jpg`,
            contentType: 'image/jpeg'
        });
        form.append('purpose', 'image');
        form.append('folder_id', folder.id);

        const upload = await agent
            .post('images/upload/')
            .body(form)
            .expectStatus(201);

        uploadedFolderPath = new URL(upload.body.images[0].url).pathname;

        await agent
            .get(`media/?search=${prefix}-folder-upload`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-folder-upload`);
                assert.equal(body.media[0].folder_id, folder.id);
            });

        await agent
            .get(`media/?filter=${encodeURIComponent(`folder_id:${folder.id}`)}`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.some(item => item.name === `${prefix}-folder-upload`), true);
            });
    });

    it('clears tracked media usage when a post is deleted', async function () {
        const media = await insertMedia({name: `${prefix}-delete-post-usage`});
        const postId = ObjectId().toHexString();

        await db.knex('posts').insert({
            id: postId,
            uuid: crypto.randomUUID(),
            title: `${prefix} Deleted usage post`,
            slug: `${prefix}-deleted-usage-post`,
            mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[]}',
            lexical: '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
            html: '',
            plaintext: '',
            feature_image: media.url,
            type: 'post',
            status: 'draft',
            visibility: 'public',
            email_recipient_filter: '',
            created_at: new Date(),
            updated_at: new Date()
        });

        await db.knex('media_file_usages').insert({
            id: ObjectId().toHexString(),
            media_file_id: media.id,
            resource_type: 'post',
            resource_id: postId,
            field: 'feature_image',
            created_at: new Date()
        });

        await agent
            .delete(`posts/${postId}/`)
            .expectStatus(204);

        const usage = await db.knex('media_file_usages')
            .where({
                media_file_id: media.id,
                resource_type: 'post',
                resource_id: postId
            })
            .first();

        assert.equal(usage, undefined);
    });
});
