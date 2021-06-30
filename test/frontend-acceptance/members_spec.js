const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const settingsCache = require('../../core/shared/settings-cache');

function assertContentIsPresent(res) {
    res.text.should.containEql('<h2 id="markdown">markdown</h2>');
}

function assertContentIsAbsent(res) {
    res.text.should.not.containEql('<h2 id="markdown">markdown</h2>');
}

describe('Front-end members behaviour', function () {
    let request;

    async function loginAsMember(email) {
        // membersService needs to be required after Ghost start so that settings
        // are pre-populated with defaults
        const membersService = require('../../core/server/services/members');

        const signinLink = await membersService.api.getMagicLink(email);
        const signinURL = new URL(signinLink);
        // request needs a relative path rather than full url with host
        const signinPath = `${signinURL.pathname}${signinURL.search}`;

        // perform a sign-in request to set members cookies on superagent
        await request.get(signinPath)
            .expect(302)
            .expect((res) => {
                const redirectUrl = new URL(res.headers.location, testUtils.API.getURL());
                should.exist(redirectUrl.searchParams.get('success'));
                redirectUrl.searchParams.get('success').should.eql('true');
            });
    }

    before(async function () {
        const originalSettingsCacheGetFn = settingsCache.get;

        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'labs') {
                return {members: true};
            }

            if (key === 'active_theme') {
                return 'price-data-test-theme';
            }

            return originalSettingsCacheGetFn(key, options);
        });
        await testUtils.startGhost();
        await testUtils.initFixtures('members');
        request = supertest.agent(configUtils.config.get('url'));
    });

    after(function () {
        sinon.restore();
    });

    describe('Member routes', function () {
        it('should error serving webhook endpoint without any parameters', async function () {
            await request.post('/members/webhooks/stripe')
                .expect(400);
        });

        it('should error when invalid member token is passed into session', async function () {
            await request.get('/members/api/session')
                .expect(400);
        });

        it('should return no content when removing member sessions', async function () {
            await request.del('/members/api/session')
                .expect(204);
        });

        it('should error for invalid member token on member data endpoint', async function () {
            await request.get('/members/api/member')
                .expect(204);
        });

        it('should serve member site endpoint', async function () {
            await request.get('/members/api/site')
                .expect(200);
        });

        it('should error for invalid data on member magic link endpoint', async function () {
            await request.post('/members/api/send-magic-link')
                .expect(400);
        });

        it('should error for invalid data on members create checkout session endpoint', async function () {
            await request.post('/members/api/create-stripe-checkout-session')
                .expect(400);
        });

        it('should error for invalid data on members create update session endpoint', async function () {
            await request.post('/members/api/create-stripe-update-session')
                .expect(400);
        });

        it('should error for invalid data on members subscription endpoint', async function () {
            await request.put('/members/api/subscriptions/123')
                .expect(400);
        });

        it('should serve theme 404 on members endpoint', async function () {
            await request.get('/members/')
                .expect(404)
                .expect('Content-Type', 'text/html; charset=utf-8');
        });

        it('should redirect invalid token on members endpoint', async function () {
            await request.get('/members/?token=abc&action=signup')
                .expect(302)
                .expect('Location', '/?action=signup&success=false');
        });
    });

    describe('Price data', function () {
        it('Can be used as a number, and with the price helper', async function () {
            // Check out test/utils/fixtures/themes/price-data-test-theme/index.hbs
            // To see where this is coming from.
            //
            const legacyUse = /You can use the price data as a number and currency: £12/;
            const withPriceHelper = /You can pass price data to the price helper: £12/;

            await request.get('/')
                .expect((res) => {
                    should.exist(res.text.match(legacyUse));
                    should.exist(res.text.match(withPriceHelper));
                });
        });
    });

    describe('Content gating', function () {
        let publicPost;
        let membersPost;
        let paidPost;
        let membersPostWithPaywallCard;
        let labelPost;
        let productPost;

        before(function () {
            publicPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'free-to-see',
                visibility: 'public',
                published_at: moment().add(15, 'seconds').toDate() // here to ensure sorting is not modified
            });

            membersPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-shalt-not-be-seen',
                visibility: 'members',
                published_at: moment().add(45, 'seconds').toDate() // here to ensure sorting is not modified
            });

            paidPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-shalt-be-paid-for',
                visibility: 'paid',
                published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
            });

            membersPostWithPaywallCard = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-shalt-have-a-taste',
                visibility: 'members',
                mobiledoc: '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["paywall",{}]],"sections":[[1,"p",[[0,[],0,"Free content"]]],[10,0],[1,"p",[[0,[],0,"Members content"]]]]}',
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                published_at: moment().add(5, 'seconds').toDate()
            });

            labelPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-must-be-labelled-vip',
                visibility: 'label:vip',
                published_at: moment().toDate()
            });

            productPost = testUtils.DataGenerator.forKnex.createPost({
                slug: 'thou-must-have-default-product',
                visibility: 'product:default-product',
                published_at: moment().toDate()
            });

            return testUtils.fixtures.insertPosts([
                publicPost,
                membersPost,
                paidPost,
                membersPostWithPaywallCard,
                labelPost,
                productPost
            ]);
        });

        describe('as non-member', function () {
            it('can read public post content', async function () {
                await request
                    .get('/free-to-see/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('cannot read members post content', async function () {
                await request
                    .get('/thou-shalt-not-be-seen/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });

            it('cannot read paid post content', async function () {
                await request
                    .get('/thou-shalt-be-paid-for/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });

            it('cannot read label-only post content', async function () {
                await request
                    .get('/thou-must-be-labelled-vip/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });

            it('cannot read product-only post content', async function () {
                await request
                    .get('/thou-must-have-default-product/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });
        });

        describe('as free member', function () {
            before(async function () {
                await loginAsMember('member1@test.com');
            });

            it('can read public post content', async function () {
                await request
                    .get('/free-to-see/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('can read members post content', async function () {
                await request
                    .get('/thou-shalt-not-be-seen/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('cannot read paid post content', async function () {
                await request
                    .get('/thou-shalt-be-paid-for/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });

            it('cannot read label-only post content', async function () {
                await request
                    .get('/thou-must-be-labelled-vip/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });

            it('cannot read product-only post content', async function () {
                await request
                    .get('/thou-must-have-default-product/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });
        });

        describe('as free member with vip label', function () {
            before(async function () {
                await loginAsMember('vip@test.com');
            });

            it('can read label-only post content', async function () {
                await request
                    .get('/thou-must-be-labelled-vip/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });
        });

        describe('as paid member', function () {
            before(async function () {
                // membersService needs to be required after Ghost start so that settings
                // are pre-populated with defaults
                const membersService = require('../../core/server/services/members');

                const signinLink = await membersService.api.getMagicLink('paid@test.com');
                const signinURL = new URL(signinLink);
                // request needs a relative path rather than full url with host
                const signinPath = `${signinURL.pathname}${signinURL.search}`;

                // perform a sign-in request to set members cookies on superagent
                await request.get(signinPath)
                    .expect(302)
                    .then((res) => {
                        const redirectUrl = new URL(res.headers.location, testUtils.API.getURL());
                        should.exist(redirectUrl.searchParams.get('success'));
                        redirectUrl.searchParams.get('success').should.eql('true');
                    });
            });

            it('can read public post content', async function () {
                await request
                    .get('/free-to-see/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('can read members post content', async function () {
                await request
                    .get('/thou-shalt-not-be-seen/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('can read paid post content', async function () {
                await request
                    .get('/thou-shalt-be-paid-for/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('cannot read label-only post content', async function () {
                await request
                    .get('/thou-must-be-labelled-vip/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });

            it('cannot read product-only post content', async function () {
                await request
                    .get('/thou-must-have-default-product/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });
        });

        describe('as paid member with vip label', function () {
            before(async function () {
                await loginAsMember('vip-paid@test.com');
            });

            it('can read label-only post content', async function () {
                await request
                    .get('/thou-must-be-labelled-vip/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });
        });

        describe('as comped member', function () {
            before(async function () {
                await loginAsMember('comped@test.com');
            });

            it('can read public post content', async function () {
                await request
                    .get('/free-to-see/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('can read members post content', async function () {
                await request
                    .get('/thou-shalt-not-be-seen/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('can read paid post content', async function () {
                await request
                    .get('/thou-shalt-be-paid-for/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('cannot read label-only post content', async function () {
                await request
                    .get('/thou-must-be-labelled-vip/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });

            it('cannot read product-only post content', async function () {
                await request
                    .get('/thou-must-have-default-product/')
                    .expect(200)
                    .expect(assertContentIsAbsent);
            });
        });

        describe('as member with product', function () {
            before(async function () {
                await loginAsMember('with-product@test.com');
            });

            it('can read product-only post content', async function () {
                await request
                    .get('/thou-must-have-default-product/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });
        });
    });
});
