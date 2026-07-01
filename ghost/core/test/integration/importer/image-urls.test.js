const assert = require('node:assert/strict');
const importer = require('../../../core/server/data/importer');
const db = require('../../../core/server/data/db');
const urlUtils = require('../../../core/shared/url-utils');
const testUtils = require('../../utils');
const {exportedBodyV5} = require('../../utils/fixtures/export/body-generator');

const dataImporter = importer.importers.find((instance) => {
    return instance.type === 'data';
});

const importOptions = {
    returnImportedData: true
};

const LEGACY_HARDCODED_USER_ID = '1';

// These assertions read the RAW database columns rather than going through the
// model, because the Post / PostsMeta models re-expand __GHOST_URL__ back to an
// absolute URL on read (parse()). The thing we care about — that the importer
// stores image URLs in transform-ready (__GHOST_URL__) form — is only visible in
// the raw stored value.
describe('Importing posts with image URLs', function () {
    let siteUrl;

    beforeEach(async function () {
        await testUtils.teardownDb();
        await testUtils.setup('roles', 'owner')();
        siteUrl = urlUtils.urlFor('home', true).replace(/\/$/, '');
    });

    async function importPosts(posts) {
        const exportData = exportedBodyV5().db[0];

        exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({
            id: LEGACY_HARDCODED_USER_ID,
            email: 'import-test-user@ghost.org',
            slug: 'import-test-user'
        });
        exportData.data.roles = [
            testUtils.DataGenerator.forKnex.createRole({name: 'Owner'})
        ];
        exportData.data.roles_users = [
            testUtils.DataGenerator.forKnex.createUsersRoles(exportData.data.users[0].id, exportData.data.roles[0].id)
        ];

        exportData.data.posts = posts.map(overrides => testUtils.DataGenerator.forKnex.createPost(Object.assign({
            authors: [{id: LEGACY_HARDCODED_USER_ID}],
            published_by: LEGACY_HARDCODED_USER_ID
        }, overrides)));

        await dataImporter.doImport(exportData, importOptions);
    }

    const rawPost = slug => db.knex('posts').where('slug', slug).first();
    const rawMeta = postId => db.knex('posts_meta').where('post_id', postId).first();

    it('stores a site-relative feature_image as transform-ready (__GHOST_URL__)', async function () {
        // The exact shape of Tangle's migrated Cloudinary URLs (INC-300).
        await importPosts([{
            slug: 'relative-feature-image',
            feature_image: '/content/images/image/upload/w_728-c_limit/znxcdabd5z1cxrxclyug.jpeg'
        }]);

        const post = await rawPost('relative-feature-image');
        assert.equal(
            post.feature_image,
            '__GHOST_URL__/content/images/image/upload/w_728-c_limit/znxcdabd5z1cxrxclyug.jpeg'
        );
    });

    it('stores an absolute site feature_image as transform-ready (__GHOST_URL__)', async function () {
        await importPosts([{
            slug: 'absolute-feature-image',
            feature_image: `${siteUrl}/content/images/2024/06/photo.png`
        }]);

        const post = await rawPost('absolute-feature-image');
        assert.equal(post.feature_image, '__GHOST_URL__/content/images/2024/06/photo.png');
    });

    it('stores site-relative og_image and twitter_image as transform-ready (__GHOST_URL__)', async function () {
        await importPosts([{
            slug: 'relative-meta-images',
            og_image: '/content/images/2024/06/og.png',
            twitter_image: '/content/images/2024/06/twitter.png'
        }]);

        const post = await rawPost('relative-meta-images');
        const meta = await rawMeta(post.id);
        assert.equal(meta.og_image, '__GHOST_URL__/content/images/2024/06/og.png');
        assert.equal(meta.twitter_image, '__GHOST_URL__/content/images/2024/06/twitter.png');
    });

    it('leaves an already transform-ready feature_image untouched', async function () {
        await importPosts([{
            slug: 'transform-ready-feature-image',
            feature_image: '__GHOST_URL__/content/images/2024/06/already.png'
        }]);

        const post = await rawPost('transform-ready-feature-image');
        assert.equal(post.feature_image, '__GHOST_URL__/content/images/2024/06/already.png');
    });

    it('leaves an external feature_image untouched', async function () {
        await importPosts([{
            slug: 'external-feature-image',
            feature_image: 'https://images.example.com/external/photo.png'
        }]);

        const post = await rawPost('external-feature-image');
        assert.equal(post.feature_image, 'https://images.example.com/external/photo.png');
    });
});
