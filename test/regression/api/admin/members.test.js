const querystring = require('querystring');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const {agentProvider, mockManager, fixtureManager} = require('../../../utils/e2e-framework');
const localUtils = require('./utils');
const labs = require('../../../../core/shared/labs');

let agent;

describe('Members API', function () {
    before(function () {
        sinon.stub(labs, 'isSet').withArgs('members').returns(true);
    });

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can add and send a signup confirmation email', async function () {
        const member = {
            name: 'Send Me Confirmation',
            email: 'member_getting_confirmation@test.com',
            subscribed: true
        };

        const queryParams = {
            send_email: true,
            email_type: 'signup'
        };

        const res = await agent
            .post(`members/?${querystring.stringify(queryParams)}`)
            .body({members: [member]})
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.members);
        jsonResponse.members.should.have.length(1);

        jsonResponse.members[0].name.should.equal(member.name);
        jsonResponse.members[0].email.should.equal(member.email);
        jsonResponse.members[0].subscribed.should.equal(member.subscribed);
        testUtils.API.isISO8601(jsonResponse.members[0].created_at).should.be.true();

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('members/')}${res.body.members[0].id}/`);

        mockManager.assert.sentEmail({
            subject: '🙌 Complete your sign up to Ghost!',
            to: 'member_getting_confirmation@test.com'
        });

        await agent
            .delete(`members/${jsonResponse.members[0].id}/`)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(204);
    });

    it('Can order by email_open_rate', async function () {
        await agent
            .get('members/?order=email_open_rate%20desc')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse.members);
                localUtils.API.checkResponse(jsonResponse, 'members');
                jsonResponse.members.should.have.length(8);

                jsonResponse.members[0].email.should.equal('paid@test.com');
                jsonResponse.members[0].email_open_rate.should.equal(80);
                jsonResponse.members[1].email.should.equal('member2@test.com');
                jsonResponse.members[1].email_open_rate.should.equal(50);
                jsonResponse.members[2].email.should.equal('member1@test.com');
                should.equal(null, jsonResponse.members[2].email_open_rate);
                jsonResponse.members[3].email.should.equal('trialing@test.com');
                should.equal(null, jsonResponse.members[3].email_open_rate);
            });

        await agent
            .get('members/?order=email_open_rate%20asc')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(200)
            .then((res) => {
                const jsonResponse = res.body;
                localUtils.API.checkResponse(jsonResponse, 'members');
                jsonResponse.members.should.have.length(8);

                jsonResponse.members[0].email.should.equal('member2@test.com');
                jsonResponse.members[0].email_open_rate.should.equal(50);
                jsonResponse.members[1].email.should.equal('paid@test.com');
                jsonResponse.members[1].email_open_rate.should.equal(80);
                jsonResponse.members[2].email.should.equal('member1@test.com');
                should.equal(null, jsonResponse.members[2].email_open_rate);
                jsonResponse.members[3].email.should.equal('trialing@test.com');
                should.equal(null, jsonResponse.members[3].email_open_rate);
            });
    });

    it('Can search by case-insensitive name', function () {
        return agent
            .get('members/?search=egg')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);
                jsonResponse.members[0].email.should.equal('member1@test.com');
                localUtils.API.checkResponse(jsonResponse, 'members');
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Can search by case-insensitive email', function () {
        return agent
            .get('members/?search=MEMBER2')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);
                jsonResponse.members[0].email.should.equal('member2@test.com');
                localUtils.API.checkResponse(jsonResponse, 'members');
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Can search for paid members', function () {
        return agent
            .get('members/?search=egon&paid=true')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);
                jsonResponse.members[0].email.should.equal('paid@test.com');
                localUtils.API.checkResponse(jsonResponse, 'members');
                localUtils.API.checkResponse(jsonResponse.members[0], 'member', 'subscriptions');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
            });
    });

    it('Search for non existing member returns empty result set', function () {
        return agent
            .get('members/?search=do_not_exist')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(0);
            });
    });

    it('Paid members subscriptions has price data', function () {
        const memberChanged = {
            name: 'Updated name'
        };
        return agent
            .get('members/?search=egon&paid=true')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);
                should.exist(jsonResponse.members[0].subscriptions[0].price);
                return jsonResponse.members[0];
            }).then((paidMember) => {
                return agent
                    .put(`members/${paidMember.id}/`)
                    .body({members: [memberChanged]})
                    .expectHeader('Content-Type', /json/)
                    .expectHeader('Cache-Control', testUtils.cacheRules.private)
                    .expectStatus(200)
                    .then((res) => {
                        should.not.exist(res.headers['x-cache-invalidate']);

                        const jsonResponse = res.body;

                        should.exist(jsonResponse);
                        should.exist(jsonResponse.members);
                        jsonResponse.members.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.members[0], 'member', ['subscriptions', 'products']);
                        should.exist(jsonResponse.members[0].subscriptions[0].price);
                        jsonResponse.members[0].name.should.equal(memberChanged.name);
                    });
            });
    });

    it('Add should fail when passing incorrect email_type query parameter', function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com'
        };

        return agent
            .post(`members/?send_email=true&email_type=lel`)
            .body({members: [member]})
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(422);
    });

    it('Add should fail when comped flag is passed in but Stripe is not enabled', function () {
        const member = {
            email: 'memberTestAdd@test.com',
            comped: true
        };

        return agent
            .post(`members/`)
            .body({members: [member]})
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(422)
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);

                jsonResponse.errors[0].message.should.eql('Validation error, cannot save member.');
                jsonResponse.errors[0].context.should.match(/Missing Stripe connection./);
            });
    });

    it('Can delete a member without cancelling Stripe Subscription', async function () {
        const member = {
            name: 'Member 2 Delete',
            email: 'Member2Delete@test.com'
        };

        const createdMember = await agent
            .post(`members/`)
            .body({members: [member]})
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(201)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.members);
                jsonResponse.members.should.have.length(1);

                return jsonResponse.members[0];
            });

        await agent
            .delete(`members/${createdMember.id}/`)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(204)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;

                should.exist(jsonResponse);
            });
    });

    it('Errors when fetching stats with unknown days param value', function () {
        return agent
            .get('members/stats/?days=nope')
            .expectHeader('Content-Type', /json/)
            .expectHeader('Cache-Control', testUtils.cacheRules.private)
            .expectStatus(422);
    });
});
