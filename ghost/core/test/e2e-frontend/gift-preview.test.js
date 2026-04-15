const assert = require('node:assert/strict');
const supertest = require('supertest');
const crypto = require('node:crypto');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const {mockManager} = require('../utils/e2e-framework');
const models = require('../../core/server/models');

describe('Gift Preview Routes', function () {
    let request;
    let giftToken;
    let tierId;

    before(async function () {
        await testUtils.startGhost();

        request = supertest.agent(configUtils.config.get('url'));

        // Get a paid tier to associate with the gift
        const tier = await models.Product.findOne({type: 'paid'});
        assert.ok(tier, 'A paid tier must exist');
        tierId = tier.get('id');

        // Create a gift record directly in the database
        giftToken = crypto.randomBytes(6).toString('base64url');
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 90);

        await models.Base.knex('gifts').insert({
            id: ObjectId().toHexString(),
            token: giftToken,
            buyer_email: 'buyer@example.com',
            buyer_member_id: null,
            redeemer_member_id: null,
            tier_id: tierId,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_test_${ObjectId().toHexString()}`,
            stripe_payment_intent_id: `pi_test_${ObjectId().toHexString()}`,
            consumes_at: null,
            expires_at: expiresAt.toISOString(),
            status: 'purchased',
            purchased_at: now.toISOString(),
            redeemed_at: null,
            consumed_at: null,
            expired_at: null,
            refunded_at: null
        });
    });

    afterEach(function () {
        mockManager.restore();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('giftSubscriptions');
    });

    describe('GET /gift/:token', function () {
        it('returns HTML with OG meta tags for a valid gift', async function () {
            const res = await request.get(`/gift/${giftToken}`);

            // Debug: log response details if not 200
            if (res.status !== 200) {
                console.log(`[gift-preview debug] status=${res.status}, location=${res.headers.location}, token=${giftToken}, tierId=${tierId}`); // eslint-disable-line no-console
                const giftRow = await models.Base.knex('gifts').where('token', giftToken).first();
                console.log(`[gift-preview debug] gift in db:`, giftRow ? 'found' : 'NOT FOUND'); // eslint-disable-line no-console
            }

            assert.equal(res.status, 200, `Expected 200 but got ${res.status}`);
            assert.match(res.headers['content-type'], /text\/html/);
            assert.match(res.headers['cache-control'], /public, max-age=3600/);

            assert.ok(res.text.includes('<meta property="og:title"'), 'Should have og:title');
            assert.ok(res.text.includes('<meta property="og:image"'), 'Should have og:image');
            assert.ok(res.text.includes('<meta property="og:description"'), 'Should have og:description');
            assert.ok(res.text.includes(`/gift/${giftToken}/image`), 'og:image should point to image route');
            assert.ok(res.text.includes(`/#/portal/gift/redeem/${giftToken}`), 'Should redirect to Portal');
        });

        it('redirects to homepage for an invalid token', async function () {
            await request.get('/gift/invalid-token-that-does-not-exist')
                .expect(302)
                .expect('Location', /\/$/);
        });
    });

    describe('GET /gift/:token/image', function () {
        it('returns a PNG image for a valid gift', async function () {
            const res = await request.get(`/gift/${giftToken}/image`)
                .expect(200)
                .expect('Content-Type', /image\/png/)
                .expect('Cache-Control', /public, max-age=86400/);

            // Check PNG magic bytes
            assert.equal(res.body[0], 0x89);
            assert.equal(res.body[1], 0x50); // P
            assert.equal(res.body[2], 0x4E); // N
            assert.equal(res.body[3], 0x47); // G
        });

        it('returns 404 for an invalid token', async function () {
            await request.get('/gift/invalid-token-that-does-not-exist/image')
                .expect(404);
        });
    });
});
