const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const crypto = require('crypto');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../../core/shared/config');
const events = require('../../../../core/server/lib/common/events');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const models = require('../../../../core/server/models');

let request;
let eventsTriggered;

const TABLE_ALLOWLIST_LENGTH = 20;
const LEGACY_HARDCODED_USER_ID = '1';

describe('DB API', function () {
    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    beforeEach(function () {
        eventsTriggered = {};

        sinon.stub(events, 'emit').callsFake((eventName, eventObj) => {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can export the database with more tables', function () {
        return request.get(localUtils.API.getApiQuery('db/?include=mobiledoc_revisions'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;
                assertExists(jsonResponse.db);
                assert.equal(jsonResponse.db.length, 1);

                // NOTE: default tables + 1 from include parameters
                assert.equal(Object.keys(jsonResponse.db[0].data).length, TABLE_ALLOWLIST_LENGTH + 1);
            });
    });

    it('can export & import', function () {
        const exportFolder = path.join(os.tmpdir(), crypto.randomUUID());
        const exportPath = path.join(exportFolder, 'export.json');

        return request.put(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .send({
                settings: [
                    {
                        key: 'is_private',
                        value: true
                    }
                ]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then(() => {
                return request.get(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;
                assertExists(jsonResponse.db);

                fs.ensureDirSync(exportFolder);
                fs.writeJSONSync(exportPath, jsonResponse);

                return request.post(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .attach('importfile', exportPath)
                    .expect(200);
            })
            .then((res) => {
                assert.equal(res.body.problems.length, 6);
                fs.removeSync(exportFolder);
            });
    });

    it('fails when triggering an export from unknown filename ', function () {
        return request.get(localUtils.API.getApiQuery('db/?filename=this_file_is_not_here.json'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(404);
    });

    it('import should fail without file', function () {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(422);
    });

    it('import should fail with unsupported file', function () {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'))
            .expect(415);
    });

    it('Can import a JSON database exported from Ghost 2.x', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        // preventively remove default "fixture" user
        const fixtureUserResponse = await request.get(localUtils.API.getApiQuery('users/slug/fixture/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        if (fixtureUserResponse.body.users) {
            await request.delete(localUtils.API.getApiQuery(`users/${fixtureUserResponse.body.users[0].id}`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json');
        }

        const res = await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/export/v2_export.json'))
            .expect(200);

        const jsonResponse = res.body;
        assertExists(jsonResponse.db);
        assertExists(jsonResponse.problems);
        assert.equal(jsonResponse.problems.length, 2);

        const postsResponse = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(postsResponse.body.posts.length, 7);

        const usersResponse = await request.get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(usersResponse.body.users.length, 3);
    });

    it('Can import a JSON database exported from Ghost 3.x', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        // preventively remove default "fixture" user
        const fixtureUserResponse = await request.get(localUtils.API.getApiQuery('users/slug/fixture/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        if (fixtureUserResponse.body.users) {
            await request.delete(localUtils.API.getApiQuery(`users/${fixtureUserResponse.body.users[0].id}`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json');
        }

        const res = await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/export/v3_export.json'))
            .expect(200);

        const jsonResponse = res.body;
        assertExists(jsonResponse.db);
        assertExists(jsonResponse.problems);
        assert.equal(jsonResponse.problems.length, 2);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res2.body.posts.length, 7);

        const usersResponse = await request.get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(usersResponse.body.users.length, 3);
    });

    it('Can import a JSON database exported from Ghost 4.x', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        // preventively remove default "fixture" user
        const fixtureUserResponse = await request.get(localUtils.API.getApiQuery('users/slug/fixture/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        if (fixtureUserResponse.body.users) {
            await request.delete(localUtils.API.getApiQuery(`users/${fixtureUserResponse.body.users[0].id}`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json');
        }

        const res = await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/export/v4_export.json'))
            .expect(200);

        const jsonResponse = res.body;
        assertExists(jsonResponse.db);
        assertExists(jsonResponse.problems);
        assert.equal(jsonResponse.problems.length, 2);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res2.body.posts.length, 7);

        const usersResponse = await request.get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(usersResponse.body.users.length, 3);
    });

    it('Can import a JSON database exported from Ghost 5.x', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        // preventively remove default "fixture" user
        const fixtureUserResponse = await request.get(localUtils.API.getApiQuery('users/slug/fixture/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        if (fixtureUserResponse.body.users) {
            await request.delete(localUtils.API.getApiQuery(`users/${fixtureUserResponse.body.users[0].id}`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json');
        }

        const res = await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/export/v5_export.json'))
            .expect(200);

        const jsonResponse = res.body;
        assertExists(jsonResponse.db);
        assertExists(jsonResponse.problems);

        // 2 expected problems:
        // - Theme not imported
        // - Duplicate free product not imported
        assert.equal(jsonResponse.problems.length, 2);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res2.body.posts.length, 1);

        // Ensure the author is not imported with the legacy hardcoded user id
        assert.notEqual(res2.body.posts[0].authors[0].id, LEGACY_HARDCODED_USER_ID);
        assert.notEqual(res2.body.posts[0].primary_author.id, LEGACY_HARDCODED_USER_ID);

        const usersResponse = await request.get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(usersResponse.body.users.length, 3);

        // Ensure user is not imported with the legacy hardcoded user id
        assert.notEqual(usersResponse.body.users[0].id, LEGACY_HARDCODED_USER_ID);
        assert.notEqual(usersResponse.body.users[1].id, LEGACY_HARDCODED_USER_ID);
        assert.notEqual(usersResponse.body.users[2].id, LEGACY_HARDCODED_USER_ID);
    });

    it('Can import a JSON database with products', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/export/products_export.json'))
            .expect(200);

        // Check if we have a product
        const product = await models.Product.findOne({slug: 'ghost-inc'});
        assertExists(product);

        assert.equal(product.get('name'), 'Ghost Inc.');
        assert.equal(product.get('description'), 'Our daily newsletter');
        assert.equal(product.get('welcome_page_url'), '/welcome');

        // Check settings
        const portalProducts = await models.Settings.findOne({key: 'portal_products'});
        assertExists(portalProducts);
        assert.deepEqual(JSON.parse(portalProducts.get('value')), []);

        // Check stripe products
        const stripeProduct = await models.StripeProduct.findOne({product_id: product.id});
        assertExists(stripeProduct);
        assert.equal(stripeProduct.get('stripe_product_id'), 'prod_d2c1708c21');
        assert.notEqual(stripeProduct.id, '60be1fc9bd3af33564cfb337');

        // Check newsletters
        const newsletter = await models.Newsletter.findOne({slug: 'test'});
        assertExists(newsletter);
        assert.equal(newsletter.get('name'), 'Ghost Inc.');
        // Make sure sender_email is not set
        assert.equal(newsletter.get('sender_email'), null);

        // Check posts
        const post = await models.Post.findOne({slug: 'test-newsletter'}, {withRelated: ['tiers']});
        assertExists(post);

        assert.equal(post.get('newsletter_id'), newsletter.id);
        assert.equal(post.get('visibility'), 'public');
        assert.equal(post.get('email_recipient_filter'), 'status:-free');

        // Check this post is connected to the imported product
        assert.deepEqual(post.relations.tiers.models.map(m => m.id), [product.id]);

        // Check stripe prices
        const monthlyPrice = await models.StripePrice.findOne({id: product.get('monthly_price_id')});
        assertExists(monthlyPrice);

        const yearlyPrice = await models.StripePrice.findOne({id: product.get('yearly_price_id')});
        assertExists(yearlyPrice);

        assert.equal(monthlyPrice.get('amount'), 500);
        assert.equal(monthlyPrice.get('currency'), 'usd');
        assert.equal(monthlyPrice.get('interval'), 'month');
        assert.equal(monthlyPrice.get('stripe_price_id'), 'price_a425520db0');
        assert.equal(monthlyPrice.get('stripe_product_id'), 'prod_d2c1708c21');

        assert.equal(yearlyPrice.get('amount'), 4800);
        assert.equal(yearlyPrice.get('currency'), 'usd');
        assert.equal(yearlyPrice.get('interval'), 'year');
        assert.equal(yearlyPrice.get('stripe_price_id'), 'price_d04baebb73');
        assert.equal(yearlyPrice.get('stripe_product_id'), 'prod_d2c1708c21');
    });

    it('Can not import a ZIP-file with symlinks', async function () {
        await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/import/symlinks.zip'))
            .expect(415);
    });
});

// The following tests will create a new clean database for every test
describe('DB API (cleaned)', function () {
    beforeEach(async function () {
        await testUtils.stopGhost();
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can import a JSON database with products for an existing product', async function () {
        // Create a product with existing slug
        const existingProduct = await models.Product.forge({
            slug: 'ghost-inc',
            name: 'Ghost Inc.',
            description: 'Our daily newsletter',
            type: 'paid',
            active: 1,
            visibility: 'public'
        }).save();

        await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/export/products_export.json'))
            .expect(200);

        // Check if we ignored the import of the product
        const productDuplicate = await models.Product.findOne({slug: 'ghost-inc-2'});
        assert.equal(productDuplicate, null);

        // Check if we have a product
        const product = await models.Product.findOne({slug: 'ghost-inc'});
        assertExists(product);
        assert.equal(product.id, existingProduct.id);
        assert.equal(product.get('slug'), 'ghost-inc');
        assert.equal(product.get('name'), 'Ghost Inc.');
        assert.equal(product.get('description'), 'Our daily newsletter');

        // Check settings
        const portalProducts = await models.Settings.findOne({key: 'portal_products'});
        assertExists(portalProducts);
        assert.deepEqual(JSON.parse(portalProducts.get('value')), []);

        // Check stripe products
        const stripeProduct = await models.StripeProduct.findOne({product_id: product.id});
        assertExists(stripeProduct);
        assert.equal(stripeProduct.get('stripe_product_id'), 'prod_d2c1708c21');
        assert.notEqual(stripeProduct.id, '60be1fc9bd3af33564cfb337');

        // Check newsletters
        const newsletter = await models.Newsletter.findOne({slug: 'test'});
        assertExists(newsletter);
        assert.equal(newsletter.get('name'), 'Ghost Inc.');
        // Make sure sender_email is not set
        assert.equal(newsletter.get('sender_email'), null);

        // Check posts
        const post = await models.Post.findOne({slug: 'test-newsletter'}, {withRelated: ['tiers']});
        assertExists(post);

        assert.equal(post.get('newsletter_id'), newsletter.id);
        assert.equal(post.get('visibility'), 'public');
        assert.equal(post.get('email_recipient_filter'), 'status:-free');

        // Check this post is connected to the imported product
        assert.deepEqual(post.relations.tiers.models.map(m => m.id), [product.id]);

        // Check stripe prices
        const monthlyPrice = await models.StripePrice.findOne({stripe_price_id: 'price_a425520db0'});
        assertExists(monthlyPrice);

        const yearlyPrice = await models.StripePrice.findOne({stripe_price_id: 'price_d04baebb73'});
        assertExists(yearlyPrice);

        assert.equal(monthlyPrice.get('amount'), 500);
        assert.equal(monthlyPrice.get('currency'), 'usd');
        assert.equal(monthlyPrice.get('interval'), 'month');
        assert.equal(monthlyPrice.get('stripe_price_id'), 'price_a425520db0');
        assert.equal(monthlyPrice.get('stripe_product_id'), 'prod_d2c1708c21');

        assert.equal(yearlyPrice.get('amount'), 4800);
        assert.equal(yearlyPrice.get('currency'), 'usd');
        assert.equal(yearlyPrice.get('interval'), 'year');
        assert.equal(yearlyPrice.get('stripe_price_id'), 'price_d04baebb73');
        assert.equal(yearlyPrice.get('stripe_product_id'), 'prod_d2c1708c21');
    });
});
