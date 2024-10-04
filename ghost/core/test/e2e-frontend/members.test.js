const assert = require('assert/strict');
const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const settingsCache = require('../../core/shared/settings-cache');
const settingsHelpers = require('../../core/server/services/settings-helpers');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent} = require('@tryghost/member-events');
const models = require('../../core/server/models');
const {fixtureManager} = require('../utils/e2e-framework');
const DataGenerator = require('../utils/fixtures/data-generator');
const members = require('../../core/server/services/members');
const membersEventsService = require('../../core/server/services/members-events');
const crypto = require('crypto');

function assertContentIsPresent(res) {
    res.text.should.containEql('<h2 id="markdown">markdown</h2>');
}

function assertContentIsAbsent(res) {
    res.text.should.not.containEql('<h2 id="markdown">markdown</h2>');
}

async function createMember(data) {
    return await members.api.members.create({
        ...data
    });
}

async function cycleTransientId(data) {
    return await members.api.members.cycleTransientId({
        ...data
    });
}

describe('Front-end members behavior', function () {
    let request;

    async function loginAsMember(email) {
        // Member should exist, because we are signin in
        const member = await models.Member.findOne({email}, {require: true});

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

        return member;
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

    beforeEach(function () {
        // Clear the lastSeenAtCache to avoid side effects from other tests
        membersEventsService.clearLastSeenAtCache();
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
                .expect('set-cookie', /ghost-members-ssr=.*;.*?expires=Thu, 01 Jan 1970 00:00:00 GMT;.*?/)
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

        it('should error for using an invalid offer id on members create checkout session endpoint', async function () {
            await request.post('/members/api/create-stripe-checkout-session')
                .send({
                    offerId: 'invalid',
                    identity: null,
                    metadata: {
                        name: 'Jamie Larsen'
                    },
                    cancelUrl: 'https://example.com/blog/?stripe=cancel',
                    customerEmail: 'jamie@example.com',
                    tierId: null,
                    cadence: null
                })
                .expect(400);
        });

        it('should error for invalid data on members create update session endpoint', async function () {
            await request.post('/members/api/create-stripe-update-session')
                .expect(400);
        });

        it('should error for invalid subscription id on members create update session endpoint', async function () {
            const membersService = require('../../core/server/services/members');
            const email = 'test-member-create-update-session@email.com';
            const member = await membersService.api.members.create({email});
            const token = await membersService.api.getMemberIdentityToken(member.get('transient_id'));
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

        describe('Newsletters', function () {
            afterEach(function () {
                sinon.restore();
            });

            it('should error for fetching member newsletters with missing uuid', async function () {
                await request.get('/members/api/member/newsletters')
                    .expect(401);
            });

            it('should error for fetching member newsletters with invalid uuid', async function () {
                await request.get('/members/api/member/newsletters?uuid=abc')
                    .expect(401);
            });

            it('should error for updating member newsletters with missing uuid', async function () {
                await request.put('/members/api/member/newsletters')
                    .expect(401);
            });

            it('should error for updating member newsletters with invalid uuid', async function () {
                await request.put('/members/api/member/newsletters?uuid=abc')
                    .expect(401);
            });

            it('should error for updating member newsletters with no key', async function () {
                sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
                await request.get('/members/api/member/newsletters?uuid=abc')
                    .expect(401);
            });

            it('should 401 for GET member newsletters with a mismatched hmac key', async function () {
                sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
                await request.get('/members/api/member/newsletters?uuid=abc&key=blah')
                    .expect(401);
            });

            it('should 401 for PUT member newsletters with a mismatched hmac key', async function () {
                sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
                await request.put('/members/api/member/newsletters?uuid=abc&key=blah')
                    .expect(401);
            });

            it('should fetch and update member newsletters with valid uuid', async function () {
                const memberUUID = DataGenerator.Content.members[0].uuid;

                // Can fetch newsletter subscriptions
                sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
                const memberHmac = crypto.createHmac('sha256', 'test').update(memberUUID).digest('hex');
                const getRes = await request.get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                    .expect(200);
                const getJsonResponse = getRes.body;

                should.exist(getJsonResponse);
                getJsonResponse.should.have.properties(['email', 'uuid', 'status', 'name', 'newsletters']);
                getJsonResponse.should.not.have.property('id');
                getJsonResponse.newsletters.should.have.length(1);

                // NOTE: these should be snapshots not code
                Object.keys(getJsonResponse.newsletters[0]).should.have.length(5);
                getJsonResponse.newsletters[0].should.have.properties([
                    'id',
                    'uuid',
                    'name',
                    'description',
                    'sort_order'
                ]);

                // Can update newsletter subscription
                const originalNewsletters = getJsonResponse.newsletters;
                const originalNewsletterName = originalNewsletters[0].name;
                originalNewsletters[0].name = 'cannot change me';

                const res = await request.put(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                    .send({
                        newsletters: []
                    })
                    .expect(200);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                jsonResponse.should.have.properties(['email', 'uuid', 'status', 'name', 'newsletters']);
                jsonResponse.should.not.have.property('id');
                jsonResponse.newsletters.should.have.length(0);

                const resRestored = await request.put(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
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
                Object.keys(restoreJsonResponse.newsletters[0]).should.have.length(5);
                restoreJsonResponse.newsletters[0].should.have.properties([
                    'id',
                    'uuid',
                    'name',
                    'description',
                    'sort_order'
                ]);

                should.equal(restoreJsonResponse.newsletters[0].name, originalNewsletterName);
            });
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
            sinon.restore();
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

        it('should pass through an optional key param', async function () {
            await request.get('/unsubscribe/?uuid=XXX&key=YYY')
                .expect(302)
                .expect('Location', 'http://127.0.0.1:2369/?uuid=XXX&key=YYY&action=unsubscribe');
        });

        it('should reject when missing a uuid', async function () {
            await request.get('/unsubscribe/')
                .expect(400);
        });

        it('should return unauthorized with a bad key', async function () {
            const newsletterId = fixtureManager.get('newsletters', 0).id;
            const member = await createMember({
                email: 'unsubscribe-member-test@example.com',
                newsletters: [
                    {id: newsletterId}
                ]
            });

            const memberUUID = member.get('uuid');
            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('therealkey');
            const memberHmac = crypto.createHmac('sha256','thefalsekey').update(memberUUID).digest('hex');

            // auth via uuid+key should fail
            await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(401);
        });

        it('should do an actual unsubscribe on POST', async function () {
            const newsletterId = fixtureManager.get('newsletters', 0).id;
            const member = await createMember({
                email: 'unsubscribe-member-test-another@example.com',
                newsletters: [
                    {id: newsletterId}
                ]
            });

            const memberUUID = member.get('uuid');
            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
            const memberHmac = crypto.createHmac('sha256','test').update(memberUUID).digest('hex');

            // Can fetch newsletter subscriptions
            let getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            let getJsonResponse = getRes.body;
            assert.equal(getJsonResponse.newsletters.length, 1);

            await request.post(`/unsubscribe/?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(201);

            getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            getJsonResponse = getRes.body;

            assert.equal(getJsonResponse.newsletters.length, 0, 'Sending a POST request to the unsubscribe endpoint should unsubscribe the member');
        });

        it('should only do a partial unsubscribe on POST', async function () {
            const newsletterId = fixtureManager.get('newsletters', 0).id;
            const newsletter2Id = fixtureManager.get('newsletters', 1).id;
            const newsletter2Uuid = fixtureManager.get('newsletters', 1).uuid;

            const member = await createMember({
                email: 'unsubscribe-member-test-2@example.com',
                newsletters: [
                    {id: newsletterId},
                    {id: newsletter2Id}
                ]
            });

            const memberUUID = member.get('uuid');
            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
            const memberHmac = crypto.createHmac('sha256','test').update(memberUUID).digest('hex');

            // Can fetch newsletter subscriptions
            let getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            let getJsonResponse = getRes.body;
            assert.equal(getJsonResponse.newsletters.length, 2);

            await request.post(`/unsubscribe/?uuid=${memberUUID}&newsletter=${newsletter2Uuid}&key=${memberHmac}`)
                .expect(201);

            getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            getJsonResponse = getRes.body;

            assert.equal(getJsonResponse.newsletters.length, 1, 'Sending a POST request to the unsubscribe endpoint should unsubscribe the member from that specific newsletter');
        });

        it('should unsubscribe from comment notifications on POST', async function () {
            const newsletterId = fixtureManager.get('newsletters', 0).id;

            const member = await createMember({
                email: 'unsubscribe-member-test-3@example.com',
                newsletters: [
                    {id: newsletterId}
                ],
                enable_comment_notifications: true
            });

            const memberUUID = member.get('uuid');
            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
            const memberHmac = crypto.createHmac('sha256','test').update(memberUUID).digest('hex');

            // Can fetch newsletter subscriptions
            let getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            let getJsonResponse = getRes.body;
            assert.equal(getJsonResponse.newsletters.length, 1);

            await request.post(`/unsubscribe/?uuid=${memberUUID}&key=${memberHmac}&comments=1`)
                .expect(201);

            const updatedMember = await members.api.members.get({id: member.id}, {withRelated: ['newsletters']});
            assert.equal(updatedMember.get('enable_comment_notifications'), false);
            assert.equal(updatedMember.related('newsletters').models.length, 1);
        });

        it('unsubscribe post works with x-www-form-urlencoded', async function () {
            const newsletterId = fixtureManager.get('newsletters', 0).id;
            const member = await createMember({
                email: 'unsubscribe-member-test-4@example.com',
                newsletters: [
                    {id: newsletterId}
                ]
            });

            const memberUUID = member.get('uuid');
            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
            const memberHmac = crypto.createHmac('sha256','test').update(memberUUID).digest('hex');

            // Can fetch newsletter subscriptions
            let getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            let getJsonResponse = getRes.body;
            assert.equal(getJsonResponse.newsletters.length, 1);

            await request.post(`/unsubscribe/?uuid=${memberUUID}&key=${memberHmac}`)
                .type('form')
                .send({'List-Unsubscribe': 'One-Click'})
                .expect(201);

            getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            getJsonResponse = getRes.body;

            assert.equal(getJsonResponse.newsletters.length, 0, 'Sending a POST request to the unsubscribe endpoint should unsubscribe the member');
        });

        it('unsubscribe post works with multipart/form-data', async function () {
            const newsletterId = fixtureManager.get('newsletters', 0).id;
            const member = await createMember({
                email: 'unsubscribe-member-test-5@example.com',
                newsletters: [
                    {id: newsletterId}
                ]
            });

            const memberUUID = member.get('uuid');
            sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test');
            const memberHmac = crypto.createHmac('sha256','test').update(memberUUID).digest('hex');

            // Can fetch newsletter subscriptions
            let getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            let getJsonResponse = getRes.body;
            assert.equal(getJsonResponse.newsletters.length, 1);

            await request.post(`/unsubscribe/?uuid=${memberUUID}&key=${memberHmac}`)
                .field('List-Unsubscribe', 'One-Click')
                .expect(201);

            getRes = await request
                .get(`/members/api/member/newsletters?uuid=${memberUUID}&key=${memberHmac}`)
                .expect(200);
            getJsonResponse = getRes.body;

            assert.equal(getJsonResponse.newsletters.length, 0, 'Sending a POST request to the unsubscribe endpoint should unsubscribe the member');
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

        describe('log out', function () {
            let member;

            beforeEach(async function () {
                member = await loginAsMember('member1@test.com');
            });

            it('an invalid token causes a set-cookie logout when requesting the identity', async function () {
                // Check logged in
                await request.get('/members/api/member')
                    .expect(200);

                // Cycle the transient id manually
                await cycleTransientId({id: member.id});

                await member.refresh();
                const transientId = member.get('transient_id');

                await request.get('/members/api/session')
                    .expect('set-cookie', /ghost-members-ssr=.*;.*?expires=Thu, 01 Jan 1970 00:00:00 GMT;.*?/)
                    .expect(204);

                // Check logged out
                await request.get('/members/api/member')
                    .expect(204);

                // Check transient id has NOT changed
                await member.refresh();
                assert.equal(member.get('transient_id'), transientId);
            });

            it('by default only destroys current session', async function () {
                const transientId = member.get('transient_id');

                // Check logged in
                await request.get('/members/api/member')
                    .expect(200);

                await request.del('/members/api/session')
                    .expect('set-cookie', /ghost-members-ssr=.*;.*?expires=Thu, 01 Jan 1970 00:00:00 GMT;.*?/)
                    .expect(204);

                // Check logged out
                await request.get('/members/api/member')
                    .expect(204);

                // Check transient id has NOT changed
                await member.refresh();
                assert.equal(member.get('transient_id'), transientId);
            });

            it('can destroy all sessions', async function () {
                const transientId = member.get('transient_id');

                // Check logged in
                await request.get('/members/api/member')
                    .expect(200);

                await request.del('/members/api/session')
                    .send({
                        all: true
                    })
                    .expect('set-cookie', /ghost-members-ssr=.*;.*?expires=Thu, 01 Jan 1970 00:00:00 GMT;.*?/)
                    .expect(204);

                // Check logged out
                await request.get('/members/api/member')
                    .expect(204);

                // Check transient id has changed
                await member.refresh();
                assert.notEqual(member.get('transient_id'), transientId);
            });

            it('can destroy only current session', async function () {
                const transientId = member.get('transient_id');

                // Check logged in
                await request.get('/members/api/member')
                    .expect(200);

                await request.del('/members/api/session')
                    .send({
                        all: false
                    })
                    .expect('set-cookie', /ghost-members-ssr=.*;.*?expires=Thu, 01 Jan 1970 00:00:00 GMT;.*?/)
                    .expect(204);

                // Check logged out
                await request.get('/members/api/member')
                    .expect(204);

                // Check transient id has NOT changed
                await member.refresh();
                assert.equal(member.get('transient_id'), transientId);
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

            it('can fetch member data', async function () {
                const res = await request.get('/members/api/member')
                    .expect(200);

                const memberData = res.body;
                should.exist(memberData);

                // @NOTE: this should be a snapshot test not code
                memberData.should.have.properties([
                    'uuid',
                    'email',
                    'name',
                    'firstname',
                    'expertise',
                    'avatar_image',
                    'subscribed',
                    'subscriptions',
                    'paid',
                    'created_at',
                    'enable_comment_notifications',
                    'newsletters',
                    'email_suppression'
                ]);
                Object.keys(memberData).should.have.length(13);
                memberData.should.not.have.property('id');
                memberData.newsletters.should.have.length(1);

                // @NOTE: this should be a snapshot test not code
                Object.keys(memberData.newsletters[0]).should.have.length(5);
                memberData.newsletters[0].should.have.properties([
                    'id',
                    'uuid',
                    'name',
                    'description',
                    'sort_order'
                ]);
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
