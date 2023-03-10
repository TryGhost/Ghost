const path = require('path');
const _ = require('lodash');
const os = require('os');
const fs = require('fs-extra');
const uuid = require('uuid');
const should = require('should');
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

describe('DB API', function () {
    let backupKey;
    let schedulerKey;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
        backupKey = _.find(testUtils.getExistingData().apiKeys, {integration: {slug: 'ghost-backup'}});
        schedulerKey = _.find(testUtils.getExistingData().apiKeys, {integration: {slug: 'ghost-scheduler'}});
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
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);

                // NOTE: default tables + 1 from include parameters
                Object.keys(jsonResponse.db[0].data).length.should.eql(TABLE_ALLOWLIST_LENGTH + 1);
            });
    });

    it('can export & import', function () {
        const exportFolder = path.join(os.tmpdir(), uuid.v4());
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
                should.exist(jsonResponse.db);

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
                res.body.problems.length.should.eql(6);
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

    it('export can be triggered by backup integration', function () {
        const backupQuery = `?filename=test`;
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup${backupQuery}`))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', backupKey)}`)
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                res.body.should.be.Object();
                res.body.db[0].filename.should.match(/test\.json/);
                fsStub.calledOnce.should.eql(true);
            });
    });

    it('export can not be triggered by integration other than backup', function () {
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup`))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', schedulerKey)}`)
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(403)
            .then((res) => {
                should.exist(res.body.errors);
                res.body.errors[0].type.should.eql('NoPermissionError');
                fsStub.called.should.eql(false);
            });
    });

    it('export can be triggered by Admin authentication', function () {
        sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200);
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
        should.exist(jsonResponse.db);
        should.exist(jsonResponse.problems);
        jsonResponse.problems.should.have.length(2);

        const postsResponse = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        postsResponse.body.posts.should.have.length(7);

        const usersResponse = await request.get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        usersResponse.body.users.should.have.length(3);
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
        should.exist(jsonResponse.db);
        should.exist(jsonResponse.problems);
        jsonResponse.problems.should.have.length(2);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.body.posts.should.have.length(7);

        const usersResponse = await request.get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        usersResponse.body.users.should.have.length(3);
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
        should.exist(jsonResponse.db);
        should.exist(jsonResponse.problems);
        jsonResponse.problems.should.have.length(2);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.body.posts.should.have.length(7);

        const usersResponse = await request.get(localUtils.API.getApiQuery('users/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        usersResponse.body.users.should.have.length(3);
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
        should.exist(product);

        product.get('name').should.equal('Ghost Inc.');
        product.get('description').should.equal('Our daily newsletter');
        product.get('welcome_page_url').should.equal('/welcome');

        // Check settings
        const portalProducts = await models.Settings.findOne({key: 'portal_products'});
        should.exist(portalProducts);
        JSON.parse(portalProducts.get('value')).should.deepEqual([]);

        // Check stripe products
        const stripeProduct = await models.StripeProduct.findOne({product_id: product.id});
        should.exist(stripeProduct);
        stripeProduct.get('stripe_product_id').should.equal('prod_d2c1708c21');
        stripeProduct.id.should.not.equal('60be1fc9bd3af33564cfb337');

        // Check newsletters
        const newsletter = await models.Newsletter.findOne({slug: 'test'});
        should.exist(newsletter);
        newsletter.get('name').should.equal('Ghost Inc.');
        // Make sure sender_email is not set
        should(newsletter.get('sender_email')).equal(null);

        // Check posts
        const post = await models.Post.findOne({slug: 'test-newsletter'}, {withRelated: ['tiers']});
        should.exist(post);

        post.get('newsletter_id').should.equal(newsletter.id);
        post.get('visibility').should.equal('public');
        post.get('email_recipient_filter').should.equal('status:-free');

        // Check this post is connected to the imported product
        post.relations.tiers.models.map(m => m.id).should.match([product.id]);

        // Check stripe prices
        const monthlyPrice = await models.StripePrice.findOne({id: product.get('monthly_price_id')});
        should.exist(monthlyPrice);

        const yearlyPrice = await models.StripePrice.findOne({id: product.get('yearly_price_id')});
        should.exist(yearlyPrice);

        monthlyPrice.get('amount').should.equal(500);
        monthlyPrice.get('currency').should.equal('usd');
        monthlyPrice.get('interval').should.equal('month');
        monthlyPrice.get('stripe_price_id').should.equal('price_a425520db0');
        monthlyPrice.get('stripe_product_id').should.equal('prod_d2c1708c21');

        yearlyPrice.get('amount').should.equal(4800);
        yearlyPrice.get('currency').should.equal('usd');
        yearlyPrice.get('interval').should.equal('year');
        yearlyPrice.get('stripe_price_id').should.equal('price_d04baebb73');
        yearlyPrice.get('stripe_product_id').should.equal('prod_d2c1708c21');
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
        should.not.exist(productDuplicate);

        // Check if we have a product
        const product = await models.Product.findOne({slug: 'ghost-inc'});
        should.exist(product);
        product.id.should.equal(existingProduct.id);
        product.get('slug').should.equal('ghost-inc');
        product.get('name').should.equal('Ghost Inc.');
        product.get('description').should.equal('Our daily newsletter');

        // Check settings
        const portalProducts = await models.Settings.findOne({key: 'portal_products'});
        should.exist(portalProducts);
        JSON.parse(portalProducts.get('value')).should.deepEqual([]);

        // Check stripe products
        const stripeProduct = await models.StripeProduct.findOne({product_id: product.id});
        should.exist(stripeProduct);
        stripeProduct.get('stripe_product_id').should.equal('prod_d2c1708c21');
        stripeProduct.id.should.not.equal('60be1fc9bd3af33564cfb337');

        // Check newsletters
        const newsletter = await models.Newsletter.findOne({slug: 'test'});
        should.exist(newsletter);
        newsletter.get('name').should.equal('Ghost Inc.');
        // Make sure sender_email is not set
        should(newsletter.get('sender_email')).equal(null);

        // Check posts
        const post = await models.Post.findOne({slug: 'test-newsletter'}, {withRelated: ['tiers']});
        should.exist(post);

        post.get('newsletter_id').should.equal(newsletter.id);
        post.get('visibility').should.equal('public');
        post.get('email_recipient_filter').should.equal('status:-free');

        // Check this post is connected to the imported product
        post.relations.tiers.models.map(m => m.id).should.match([product.id]);

        // Check stripe prices
        const monthlyPrice = await models.StripePrice.findOne({stripe_price_id: 'price_a425520db0'});
        should.exist(monthlyPrice);

        const yearlyPrice = await models.StripePrice.findOne({stripe_price_id: 'price_d04baebb73'});
        should.exist(yearlyPrice);

        monthlyPrice.get('amount').should.equal(500);
        monthlyPrice.get('currency').should.equal('usd');
        monthlyPrice.get('interval').should.equal('month');
        monthlyPrice.get('stripe_price_id').should.equal('price_a425520db0');
        monthlyPrice.get('stripe_product_id').should.equal('prod_d2c1708c21');

        yearlyPrice.get('amount').should.equal(4800);
        yearlyPrice.get('currency').should.equal('usd');
        yearlyPrice.get('interval').should.equal('year');
        yearlyPrice.get('stripe_price_id').should.equal('price_d04baebb73');
        yearlyPrice.get('stripe_product_id').should.equal('prod_d2c1708c21');
    });
});
