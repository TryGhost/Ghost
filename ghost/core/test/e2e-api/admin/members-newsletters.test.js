const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyContentLength, anyEtag, anyObjectId, anyUuid, anyISODateTime, anyArray, anyObject, nullable} = matchers;
const settingsHelpers = require('../../../core/server/services/settings-helpers');
const sinon = require('sinon');

const memberMatcherShallowIncludesForNewsletters = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    subscriptions: anyArray,
    current_subscription: nullable(anyObject),
    labels: anyArray,
    newsletters: anyArray
};

let agent;

describe('Members API - With Newsletters', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        sinon.stub(settingsHelpers, 'createUnsubscribeUrl').returns('http://domain.com/unsubscribe/?uuid=memberuuid&key=abc123dontstealme');
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
                'content-version': anyContentVersion,
                'content-length': anyContentLength,
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
                'content-version': anyContentVersion,
                'content-length': anyContentLength,
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
        sinon.stub(settingsHelpers, 'createUnsubscribeUrl').returns('http://domain.com/unsubscribe/?uuid=memberuuid&key=abc123dontstealme');
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
                'content-version': anyContentVersion,
                'content-length': anyContentLength,
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
                'content-version': anyContentVersion,
                'content-length': anyContentLength,
                etag: anyEtag
            });
    });
});
