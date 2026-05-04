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
        {name: 'Read media', action_type: 'read', object_type: 'media'}
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

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await ensureMediaPermissions();
        await agent.loginAsOwner();

        prefix = `media-library-v1-${Date.now()}`;
        backfillPath = path.join(config.get('paths:contentPath'), 'images', '2026', '05', `${prefix}-backfill.jpg`);
        await fs.ensureDir(path.dirname(backfillPath));
        await fs.copy(path.join(__dirname, '../../utils/fixtures/images/ghosticon.jpg'), backfillPath);
    });

    after(async function () {
        if (prefix) {
            await db.knex('media_file_usages').whereIn('media_file_id', function () {
                this.select('id').from('media_files').where('name', 'like', `${prefix}%`);
            }).del();
            await db.knex('media_files').where('name', 'like', `${prefix}%`).del();
        }

        if (backfillPath) {
            await fs.remove(backfillPath);
        }

        if (uploadedPath) {
            await fs.remove(config.get('paths').appRoot + uploadedPath);
        }
    });

    async function insertMedia(overrides) {
        const now = new Date();
        const media = {
            id: ObjectId().toHexString(),
            url: `https://example.com/content/images/${prefix}-${ObjectId().toHexString()}.jpg`,
            url_hash: null,
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
            source: 'backfill',
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

        await agent
            .get(`media/?search=${collectionPrefix}&order=${encodeURIComponent('name asc')}&limit=2`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.deepEqual(body.media.map(item => item.name), [`${collectionPrefix}-alpha`, `${collectionPrefix}-beta`]);
                assert.equal(body.meta.pagination.total, 3);
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
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${collectionPrefix}-beta`);
            });
    });

    it('reads a single media file with usage rows', async function () {
        const media = await insertMedia({name: `${prefix}-with-usage`});

        await db.knex('media_file_usages').insert({
            id: ObjectId().toHexString(),
            media_file_id: media.id,
            resource_type: 'post',
            resource_id: ObjectId().toHexString(),
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
            });
    });

    it('backfills local content files before browsing', async function () {
        await agent
            .get(`media/?search=${prefix}-backfill`)
            .expectStatus(200)
            .expect(({body}) => {
                assert.equal(body.media.length, 1);
                assert.equal(body.media[0].name, `${prefix}-backfill.jpg`);
                assert.equal(body.media[0].source, 'backfill');
                assert.equal(body.media[0].media_type, 'image');
            });
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
                assert.equal(body.media[0].name, `${prefix}-upload.jpg`);
                assert.equal(body.media[0].source, 'upload');
                assert.equal(body.media[0].storage_type, 'images');
            });
    });
});
