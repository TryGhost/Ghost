const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, anyISODate, anyString, anyArray, anyLocationFor, anyErrorId} = matchers;

const assert = require('assert');
const nock = require('nock');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const Papa = require('papaparse');

const models = require('../../../core/server/models');
const {Product} = require('../../../core/server/models/product');

async function assertMemberEvents({eventType, memberId, asserts}) {
    const events = await models[eventType].where('member_id', memberId).fetchAll();
    events.map(e => e.toJSON()).should.match(asserts);
    assert.equal(events.length, asserts.length, `Only ${asserts.length} ${eventType} should have been added.`);
}

async function assertSubscription(subscriptionId, asserts) {
    // eslint-disable-next-line dot-notation
    const subscription = await models['StripeCustomerSubscription'].where('subscription_id', subscriptionId).fetch({require: true});

    // We use the native toJSON to prevent calling the overriden serialize method
    models.Base.Model.prototype.serialize.call(subscription).should.match(asserts);
}

async function getPaidProduct() {
    return await Product.findOne({type: 'paid'});
}

const memberMatcherNoIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const memberMatcherShallowIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    subscriptions: anyArray,
    labels: anyArray
};

const memberMatcherShallowIncludesForNewsletters = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    subscriptions: anyArray,
    labels: anyArray,
    newsletters: anyArray
};

let agent;

describe('Members API - No Newsletters', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsDisabled('multipleNewsletters');
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can fetch members who are subscribed', async function () {
        await agent
            .get('/members/?filter=subscribed:true')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(6).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch members who are NOT subscribed', async function () {
        await agent
            .get('/members/?filter=subscribed:false')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(2).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});

describe('Members API - With Newsletters', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleNewsletters');
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can fetch members who are subscribed', async function () {
        await agent
            .get('/members/?filter=newsletters.status:active')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(6).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch members who are NOT subscribed', async function () {
        await agent
            .get('/members/?filter=newsletters.status:-active')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(2).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});

describe('Members API - With Newsletters - compat mode', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleNewsletters');
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can fetch members who are subscribed', async function () {
        await agent
            .get('/members/?filter=subscribed:true')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(6).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch members who are NOT subscribed', async function () {
        await agent
            .get('/members/?filter=subscribed:false')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(2).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
