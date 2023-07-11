const assert = require('assert/strict');
const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const settingsCache = require('../../core/shared/settings-cache');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent} = require('@tryghost/member-events');
const models = require('../../core/server/models');
const {mockManager} = require('../utils/e2e-framework');
const DataGenerator = require('../utils/fixtures/data-generator');

function assertContentIsPresent(res) {
    res.text.should.containEql('<h2 id="markdown">markdown</h2>');
}

function assertContentIsAbsent(res) {
    res.text.should.not.containEql('<h2 id="markdown">markdown</h2>');
}

describe('Front-end members behavior', function () {
    let request;

    async function loginAsMember(email) {
        // Member should exist, because we are signin in
        await models.Member.findOne({email}, {require: true});

        // membersService needs to be required after Ghost start so that settings
        // are pre-populated with defaults
        const membersService = require('../../core/server/services/members');

        const signinLink = await membersService.api.getMagicLink(email, 'signin');
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
                return 'members-test-theme';
            }

            return originalSettingsCacheGetFn(key, options);
        });
        await testUtils.startGhost({
            copyThemes: true
        });
        await testUtils.initFixtures('newsletters', 'members:newsletters');

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

        it('should fail processing a webhook endpoint with stripe header', async function () {
            await request.post('/members/webhooks/stripe')
                .set('Stripe-Signature', 'test-invalid-signature')
                .expect(401);
        });

        it('should return no content for invalid token passed in session', async function () {
            await request.get('/members/api/session')
                .expect(204);
        });

        it('should return no content when removing member sessions', async function () {
            await request.del('/members/api/session')
                .expect(204);
        });

        it('should error for invalid member token on member data endpoint', async function () {
            await request.get('/members/api/member')
                .expect(204);
        });

        it('should error for invalid data on member magic link endpoint', async function () {
            await request.post('/members/api/send-magic-link')
                .expect(400);
        });

        it('should error for invalid data on members create checkout session endpoint', async function () {
            await request.post('/members/api/create-stripe-checkout-session')
                .expect(400);
        });

        //TODO: Remove 500 expect once tests are wired up with Stripe
        it('should not throw 400 for using offer id on members create checkout session endpoint', async function () {
            await request.post('/members/api/create-stripe-checkout-session')
                .send({
                    offerId: '62826b1b6dccb3e3e997ebd4',
                    identity: null,
                    metadata: {
                        name: 'Jamie Larsen'
                    },
                    cancelUrl: 'https://example.com/blog/?stripe=cancel',
                    customerEmail: 'jamie@example.com',
                    tierId: null,
                    cadence: null
                })
                .expect(500);
        });

        it('should error for invalid data on members create update session endpoint', async function () {
            await request.post('/members/api/create-stripe-update-session')
                .expect(400);
        });

        it('should error for invalid subscription id on members create update session endpoint', async function () {
            const membersService = require('../../core/server/services/members');
            const email = 'test-member-create-update-session@email.com';
            await membersService.api.members.create({email});
            const token = await membersService.api.getMemberIdentityToken(email);
            await request.post('/members/api/create-stripe-update-session')
                .send({
                    identity: token,
                    subscription_id: 'invalid'
                })
                .expect(404)
                .expect('Content-Type', 'text/plain;charset=UTF-8')
                .expect((res) => {
                    res.text.should.eql('Could not find subscription invalid');
                });
        });

        it('should error for invalid data on members subscription endpoint', async function () {
            await request.put('/members/api/subscriptions/123')
                .expect(400);
        });

        it('should error for fetching member newsletters with missing uuid', async function () {
            await request.get('/members/api/member/newsletters')
                .expect(400);
        });

        it('should error for fetching member newsletters with invalid uuid', async function () {
            await request.get('/members/api/member/newsletters?uuid=abc')
                .expect(404);
        });

        it('should error for updating member newsletters with missing uuid', async function () {
            await request.put('/members/api/member/newsletters')
                .expect(400);
        });

        it('should error for updating member newsletters with invalid uuid', async function () {
            await request.put('/members/api/member/newsletters?uuid=abc')
                .expect(404);
        });

        it('should fetch and update member newsletters with valid uuid', async function () {
            const memberUUID = DataGenerator.Content.members[0].uuid;

            // Can fetch newsletter subscriptions
            const getRes = await request.get(`/members/api/member/newsletters?uuid=${memberUUID}`)
                .expect(200);
            const getJsonResponse = getRes.body;

            should.exist(getJsonResponse);
            getJsonResponse.should.have.properties(['email', 'uuid', 'status', 'name', 'newsletters']);
            getJsonResponse.should.not.have.property('id');
            getJsonResponse.newsletters.should.have.length(1);

            // Can update newsletter subscription
            const originalNewsletters = getJsonResponse.newsletters;
            const originalNewsletterName = originalNewsletters[0].name;
            originalNewsletters[0].name = 'cannot change me';

            const res = await request.put(`/members/api/member/newsletters?uuid=${memberUUID}`)
                .send({
                    newsletters: []
                })
                .expect(200);
            const jsonResponse = res.body;

            should.exist(jsonResponse);
            jsonResponse.should.have.properties(['email', 'uuid', 'status', 'name', 'newsletters']);
            jsonResponse.should.not.have.property('id');
            jsonResponse.newsletters.should.have.length(0);

            const resRestored = await request.put(`/members/api/member/newsletters?uuid=${memberUUID}`)
                .send({
                    newsletters: originalNewsletters
                })
                .expect(200);

            const restoreJsonResponse = resRestored.body;
            should.exist(restoreJsonResponse);
            restoreJsonResponse.should.have.properties(['email', 'uuid', 'status', 'name', 'newsletters']);
            restoreJsonResponse.should.not.have.property('id');
            restoreJsonResponse.newsletters.should.have.length(1);
            // @NOTE: this seems like too much exposed information, needs a review
            restoreJsonResponse.newsletters[0].should.have.properties([
                'id',
                'uuid',
                'name',
                'description',
                'feedback_enabled',
                'slug',
                'sender_name',
                'sender_email',
                'sender_reply_to',
                'status',
                'visibility',
                'subscribe_on_signup',
                'sort_order',
                'header_image',
                'show_header_icon',
                'show_header_title',
                'title_font_category',
                'title_alignment',
                'show_feature_image',
                'body_font_category',
                'footer_content',
                'show_badge',
                'show_header_name',
                'show_post_title_section',
                'show_comment_cta',
                'show_subscription_details',
                'show_latest_posts',
                'created_at',
                'updated_at'
            ]);

            should.equal(restoreJsonResponse.newsletters[0].name, originalNewsletterName);
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

    describe('Unsubscribe', function () {
        afterEach(function () {
            mockManager.restore();
        });

        it('should redirect with uuid and action param', async function () {
            await request.get('/unsubscribe/?uuid=XXX')
                .expect(302)
                .expect('Location', 'http://127.0.0.1:2369/?uuid=XXX&action=unsubscribe');
        });

        it('should pass through an optional newsletter param', async function () {
            await request.get('/unsubscribe/?uuid=XXX&newsletter=YYY')
                .expect(302)
                .expect('Location', 'http://127.0.0.1:2369/?uuid=XXX&newsletter=YYY&action=unsubscribe');
        });

        it('should reject when missing a uuid', async function () {
            await request.get('/unsubscribe/')
                .expect(400);
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

            it('doesn\'t generate a MemberPageView event', async function () {
                const spy = sinon.spy();
                DomainEvents.subscribe(MemberPageViewEvent, spy);

                await request
                    .get('/free-to-see/')
                    .expect(200)
                    .expect(assertContentIsPresent);

                assert(spy.notCalled, 'A page view from a non-member shouldn\'t generate a MemberPageViewEvent event');
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
            const email = 'vip@test.com';
            before(async function () {
                await loginAsMember(email);
            });

            it('generates a MemberPageView event', async function () {
                const spy = sinon.spy();
                DomainEvents.subscribe(MemberPageViewEvent, spy);

                // Reset last_seen_at property
                let member = await models.Member.findOne({email});
                await models.Member.edit({last_seen_at: null}, {id: member.get('id')});

                member = await models.Member.findOne({email});
                assert.equal(member.get('last_seen_at'), null, 'The member shouldn\'t have a `last_seen_at` property set before this test.');

                await request
                    .get('/free-to-see/')
                    .expect(200)
                    .expect(assertContentIsPresent);

                await DomainEvents.allSettled();

                assert(spy.calledOnce, 'A page view from a member should generate a MemberPageViewEvent event');
                member = await models.Member.findOne({email});
                assert.notEqual(member.get('last_seen_at'), null, 'The member should have a `last_seen_at` property after having visited a page while logged-in.');
            });
        });

        describe('as paid member', function () {
            const email = 'paid@test.com';
            before(async function () {
                // Member should exist, because we are signin in
                await models.Member.findOne({email}, {require: true});

                // membersService needs to be required after Ghost start so that settings
                // are pre-populated with defaults
                const membersService = require('../../core/server/services/members');

                const signinLink = await membersService.api.getMagicLink(email, 'signin');
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

            it('can read product-only post content', async function () {
                await request
                    .get('/thou-must-have-default-product/')
                    .expect(200)
                    .expect(assertContentIsPresent);
            });

            it('generates a MemberPageView event', async function () {
                const spy = sinon.spy();
                DomainEvents.subscribe(MemberPageViewEvent, spy);

                // Reset last_seen_at property
                let member = await models.Member.findOne({email});
                await models.Member.edit({last_seen_at: null}, {id: member.get('id')});

                member = await models.Member.findOne({email});
                assert.equal(member.get('last_seen_at'), null, 'The member shouldn\'t have a `last_seen_at` property set before this test.');

                await request
                    .get('/free-to-see/')
                    .expect(200)
                    .expect(assertContentIsPresent);

                await DomainEvents.allSettled();

                assert(spy.calledOnce, 'A page view from a member should generate a MemberPageViewEvent event');
                member = await models.Member.findOne({email});
                assert.notEqual(member.get('last_seen_at'), null, 'The member should have a `last_seen_at` property after having visited a page while logged-in.');
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

            it('can read product-only post content', async function () {
                await request
                    .get('/thou-must-have-default-product/')
                    .expect(200)
                    .expect(assertContentIsPresent);
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
