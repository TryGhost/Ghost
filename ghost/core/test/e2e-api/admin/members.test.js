const {agentProvider, mockManager, fixtureManager, matchers, regexes} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyUuid, anyISODateTime, anyISODate, anyString, anyArray, anyLocationFor, anyContentLength, anyErrorId, anyObject} = matchers;
const {queryStringToken} = regexes;
const ObjectId = require('bson-objectid').default;

const assert = require('assert/strict');
const nock = require('nock');
const sinon = require('sinon');
const should = require('should');

const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');

const Papa = require('papaparse');

const models = require('../../../core/server/models');
const membersService = require('../../../core/server/services/members');
const memberAttributionService = require('../../../core/server/services/member-attribution');
const urlService = require('../../../core/server/services/url');
const urlUtils = require('../../../core/shared/url-utils');
const settingsCache = require('../../../core/shared/settings-cache');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const {stripeMocker} = require('../../utils/e2e-framework-mock-manager');

/**
 * Assert that haystack and needles match, ignoring the order.
 */
function matchArrayWithoutOrder(haystack, needles) {
    // Order shouldn't matter here
    for (const a of needles) {
        haystack.should.matchAny(a);
    }

    assert.equal(haystack.length, needles.length, `Expected ${needles.length} items, but got ${haystack.length}`);
}

async function assertMemberEvents({eventType, memberId, asserts}) {
    const events = await models[eventType].where('member_id', memberId).fetchAll();
    const eventsJSON = events.map(e => e.toJSON());

    // Order shouldn't matter here
    for (const a of asserts) {
        eventsJSON.should.matchAny(a);
    }
    assert.equal(events.length, asserts.length, `Only ${asserts.length} ${eventType} should have been added.`);
}

async function assertSubscription(subscriptionId, asserts) {
    // eslint-disable-next-line dot-notation
    const subscription = await models['StripeCustomerSubscription'].where('subscription_id', subscriptionId).fetch({require: true});

    // We use the native toJSON to prevent calling the overriden serialize method
    models.Base.Model.prototype.serialize.call(subscription).should.match(asserts);
}

async function getPaidProduct() {
    return await models.Product.findOne({type: 'paid'});
}

async function getOtherPaidProduct() {
    return (await models.Product.findAll({type: 'paid'})).models[0];
}

async function getNewsletters() {
    return (await models.Newsletter.findAll({filter: 'status:active'})).models;
}

const newsletterSnapshot = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const subscriptionSnapshot = {
    id: anyString,
    start_date: anyString,
    current_period_end: anyString,
    price: {
        id: anyString,
        price_id: anyObjectId,
        tier: {
            id: anyString,
            tier_id: anyObjectId
        }
    },
    plan: {
        id: anyString
    },
    customer: {
        id: anyString
    }
};

const tierSnapshot = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    monthly_price_id: anyString,
    yearly_price_id: anyString
};

const subscriptionSnapshotWithTier = {
    ...subscriptionSnapshot,
    tier: tierSnapshot
};

function buildMemberWithoutIncludesSnapshot(options) {
    return {
        id: anyObjectId,
        uuid: anyUuid,
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        newsletters: new Array(options.newsletters).fill(newsletterSnapshot)
    };
}

function buildMemberWithIncludesSnapshot(options) {
    return {
        id: anyObjectId,
        uuid: anyUuid,
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        newsletters: new Array(options.newsletters).fill(newsletterSnapshot),
        subscriptions: anyArray,
        labels: anyArray
    };
}

const tierMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    monthly_price_id: anyObjectId,
    yearly_price_id: anyObjectId
};

const memberMatcherShallowIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    subscriptions: anyArray,
    labels: anyArray,
    newsletters: anyArray
};

const buildMemberMatcherShallowIncludesWithTiers = (tiersCount) => {
    let tiers = anyArray;
    if (tiersCount) {
        tiers = new Array(tiers).fill(tierMatcher);
    }

    return {
        ...memberMatcherShallowIncludes,
        tiers
    };
};

let agent;

describe('Members API without Stripe', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();

        await agent
            .delete('/settings/stripe/connect/')
            .expectStatus(204);
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Add should fail when comped flag is passed in but Stripe is not enabled', async function () {
        const newMember = {
            email: 'memberTestAdd@test.com',
            comped: true
        };

        await agent
            .post(`members/`)
            .body({members: [newMember]})
            .expectStatus(422)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });
});

// Tests specific for member attribution
describe('Members API - member attribution', function () {
    const signupAttributions = [];

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'newsletters', 'members:newsletters', 'comments');
        await agent.loginAsOwner();
        // This is required so that the only members in this test are created by this test, and not from fixtures.
        await models.Member.query().del();
    });

    beforeEach(function () {
        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can read member attributed to a post', async function () {
        const id = fixtureManager.get('posts', 0).id;
        const post = await models.Post.where('id', id).fetch({require: true});

        // Set the attribution for this member manually
        const member = await membersService.api.members.create({
            email: 'member-attributed-to-post@test.com',
            attribution: memberAttributionService.attributionBuilder.build({
                id,
                url: '/out-of-date/',
                type: 'post',
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            })
        });

        const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true});

        await agent
            .get(`/members/${member.id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(({body}) => {
                should(body.members[0].attribution).eql({
                    id: post.id,
                    url: absoluteUrl,
                    type: 'post',
                    title: post.get('title'),
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null
                });
                signupAttributions.push(body.members[0].attribution);
            });
    });

    it('Can read member attributed to a page', async function () {
        const id = fixtureManager.get('posts', 5).id;
        const post = await models.Post.where('id', id).fetch({require: true});

        // Set the attribution for this member manually
        const member = await membersService.api.members.create({
            email: 'member-attributed-to-page@test.com',
            attribution: memberAttributionService.attributionBuilder.build({
                id,
                url: '/out-of-date/',
                type: 'page',
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            })
        });

        const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true});

        await agent
            .get(`/members/${member.id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(({body}) => {
                should(body.members[0].attribution).eql({
                    id: post.id,
                    url: absoluteUrl,
                    type: 'page',
                    title: post.get('title'),
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null
                });
                signupAttributions.push(body.members[0].attribution);
            });
    });

    it('Can read member attributed to a tag', async function () {
        const id = fixtureManager.get('tags', 0).id;
        const tag = await models.Tag.where('id', id).fetch({require: true});

        // Set the attribution for this member manually
        const member = await membersService.api.members.create({
            email: 'member-attributed-to-tag@test.com',
            attribution: memberAttributionService.attributionBuilder.build({
                id,
                url: '/out-of-date/',
                type: 'tag',
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            })
        });

        const absoluteUrl = urlService.getUrlByResourceId(tag.id, {absolute: true});

        await agent
            .get(`/members/${member.id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(({body}) => {
                should(body.members[0].attribution).eql({
                    id: tag.id,
                    url: absoluteUrl,
                    type: 'tag',
                    title: tag.get('name'),
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null
                });
                signupAttributions.push(body.members[0].attribution);
            });
    });

    it('Can read member attributed to an author', async function () {
        const id = fixtureManager.get('users', 0).id;
        const author = await models.User.where('id', id).fetch({require: true});

        // Set the attribution for this member manually
        const member = await membersService.api.members.create({
            email: 'member-attributed-to-author@test.com',
            attribution: memberAttributionService.attributionBuilder.build({
                id,
                url: '/out-of-date/',
                type: 'author',
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            })
        });

        const absoluteUrl = urlService.getUrlByResourceId(author.id, {absolute: true});

        await agent
            .get(`/members/${member.id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(({body}) => {
                should(body.members[0].attribution).eql({
                    id: author.id,
                    url: absoluteUrl,
                    type: 'author',
                    title: author.get('name'),
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null
                });
                signupAttributions.push(body.members[0].attribution);
            });
    });

    it('Can read member attributed to an url', async function () {
        // Set the attribution for this member manually
        const member = await membersService.api.members.create({
            email: 'member-attributed-to-url@test.com',
            attribution: memberAttributionService.attributionBuilder.build({
                id: null,
                url: '/a-static-page/',
                type: 'url',
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            })
        });

        const absoluteUrl = urlUtils.createUrl('/a-static-page/', true);

        await agent
            .get(`/members/${member.id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expect(({body}) => {
                should(body.members[0].attribution).eql({
                    id: null,
                    url: absoluteUrl,
                    type: 'url',
                    title: '/a-static-page/',
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null
                });
                signupAttributions.push(body.members[0].attribution);
            });
    });

    // Activity feed
    it('Returns sign up attributions of all types in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events/?filter=type:signup_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                events: new Array(signupAttributions.length).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                should(body.events.find(e => e.type !== 'signup_event')).be.undefined();
                should(body.events.map(e => e.data.attribution)).containDeep(signupAttributions);
            });
    });
});

describe('Members API', function () {
    let newsletters;
    let emailMockReceiver;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'newsletters', 'members:newsletters', 'comments', 'redirects', 'clicks');
        await agent.loginAsOwner();

        newsletters = await getNewsletters();
    });

    beforeEach(function () {
        mockManager.mockStripe();
        emailMockReceiver = mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can browse', async function () {
        await agent
            .get('/members/')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can browse with filter', async function () {
        await agent
            .get('/members/?filter=label:label-1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can filter by signup attribution', async function () {
        await agent
            .get('/members/?filter=signup:' + fixtureManager.get('posts', 0).id)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(3).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can filter by signup attribution', async function () {
        await agent
            .get('/members/?filter=conversion:' + fixtureManager.get('posts', 0).id)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can browse with search', async function () {
        await agent
            .get('/members/?search=member1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can filter by paid status', async function () {
        await agent
            .get('/members/?filter=status:paid')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(5).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can filter by tier id', async function () {
        const products = await getPaidProduct();
        await agent
            .get(`/members/?filter=tier_id:[${products.toJSON().id}]`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(4).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can filter using contains operators', async function () {
        await agent
            .get(`/members/?filter=name:~'Venkman'`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can ignore any unknown includes', async function () {
        await agent
            .get('/members/?filter=status:paid&include=emailRecipients')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(5).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can order by email_open_rate', async function () {
        await agent
            .get('members/?order=email_open_rate%20desc')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyContentLength,
                'content-version': anyContentVersion
            })
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludes)
            })
            .expect(({body}) => {
                const {members} = body;
                assert.equal(members[0].email_open_rate > members[1].email_open_rate, true, 'Expected the first member to have a greater open rate than the second.');
            });

        await agent
            .get('members/?order=email_open_rate%20asc')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyContentLength,
                'content-version': anyContentVersion
            })
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludes)
            })
            .expect(({body}) => {
                const {members} = body;
                assert.equal(members[0].email_open_rate < members[1].email_open_rate, true, 'Expected the first member to have a smaller open rate than the second.');
            });
    });

    it('Search by case-insensitive name egg receives member with name Mr Egg', async function () {
        await agent
            .get('members/?search=egg')
            .expectStatus(200)
            .matchBodySnapshot({
                members: [memberMatcherShallowIncludes]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Search by case-insensitive email MEMBER2 receives member with email member2@test.com', async function () {
        await agent
            .get('members/?search=MEMBER2')
            .expectStatus(200)
            .matchBodySnapshot({
                members: [memberMatcherShallowIncludes]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Search for paid members retrieves member with email paid@test.com', async function () {
        await agent
            .get('members/?search=egon&paid=true')
            .expectStatus(200)
            .matchBodySnapshot({
                members: [memberMatcherShallowIncludes]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Search for non existing member returns empty result set', async function () {
        await agent
            .get('members/?search=do_not_exist')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                members: []
            });
    });

    // Read a member

    it('Can read', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can read and include email_recipients', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/?include=email_recipients`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can read and include tiers', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/?include=tiers`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(buildMemberMatcherShallowIncludesWithTiers())
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    // Create a member

    it('Can add', async function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com',
            note: 'test note',
            newsletters: [],
            labels: ['test-label']
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const newMember = body.members[0];

        // Cannot add same member twice
        const loggingStub = sinon.stub(logging, 'error');
        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(422);
        sinon.assert.calledOnce(loggingStub);

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }
            ]
        });
    });

    it('Can add a member and trigger host email verification limits', async function () {
        configUtils.set('hostSettings:emailVerification', {
            apiThreshold: 0,
            adminThreshold: 1,
            importThreshold: 0,
            verified: false,
            escalationAddress: 'test@example.com'
        });

        assert.ok(!settingsCache.get('email_verification_required'), 'Email verification should NOT be required');

        const member = {
            name: 'pass verification',
            email: 'memberPassVerifivation@test.com'
        };

        const {body: passBody} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const memberPassVerification = passBody.members[0];

        await DomainEvents.allSettled();
        assert.ok(!settingsCache.get('email_verification_required'), 'Email verification should NOT be required');

        const memberFailLimit = {
            name: 'fail verification',
            email: 'memberFailVerifivation@test.com'
        };

        const {body: failBody} = await agent
            .post(`/members/`)
            .body({members: [memberFailLimit]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const memberFailVerification = failBody.members[0];

        await DomainEvents.allSettled();
        assert.ok(settingsCache.get('email_verification_required'), 'Email verification should be required');

        mockManager.assert.sentEmail({
            subject: 'Email needs verification'
        });

        // state cleanup
        await agent.delete(`/members/${memberPassVerification.id}`);
        await agent.delete(`/members/${memberFailVerification.id}`);

        await configUtils.restore();
    });

    it('Can add and send a signup confirmation email', async function () {
        const member = {
            name: 'Send Me Confirmation',
            email: 'member_getting_confirmation@test.com',
            newsletters: [
                newsletters[0],
                newsletters[1]
            ]
        };

        // Set site title to something with a special character to ensure subject line doesn't get escaped
        // Refs https://github.com/TryGhost/Team/issues/2895
        await agent.put('/settings/')
            .body({
                settings: [
                    {
                        key: 'title',
                        value: 'Ghost\'s Test Site'
                    }
                ]
            })
            .expectStatus(200);

        const {body} = await agent
            .post('/members/?send_email=true&email_type=signup')
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [
                    buildMemberWithoutIncludesSnapshot({
                        newsletters: 2
                    })
                ]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyString
            });

        const newMember = body.members[0];

        emailMockReceiver
            .assertSentEmailCount(1)
            .matchHTMLSnapshot([{
                pattern: queryStringToken('token'),
                replacement: 'token=REPLACED_TOKEN'
            }])
            .matchPlaintextSnapshot([{
                pattern: queryStringToken('token'),
                replacement: 'token=REPLACED_TOKEN'
            }])
            .matchMetadataSnapshot();

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[0].id
                },
                {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[1].id
                }
            ]
        });

        // @TODO: do we really need to delete this member here?
        await agent
            .delete(`members/${body.members[0].id}/`)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expectStatus(204);

        // There should be no MemberSubscribeEvent remaining.
        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: []
        });

        // Reset the site title to the default
        await agent.put('/settings/')
            .body({
                settings: [
                    {
                        key: 'title',
                        value: 'Ghost'
                    }
                ]
            })
            .expectStatus(200);
    });

    it('Add should fail when passing incorrect email_type query parameter', async function () {
        const newMember = {
            name: 'test',
            email: 'memberTestAdd@test.com'
        };

        const statusEventsBefore = await models.MemberStatusEvent.findAll();

        sinon.stub(logging, 'error');
        await agent
            .post(`members/?send_email=true&email_type=lel`)
            .body({members: [newMember]})
            .expectStatus(422)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });

        const statusEvents = await models.MemberStatusEvent.findAll();
        assert.equal(statusEvents.models.length, statusEventsBefore.models.length, 'No MemberStatusEvent should have been added after failing to create a subscription.');
    });

    // Edit a member

    it('Can add complimentary subscription (out of date)', async function () {
        const stripeService = require('../../../core/server/services/stripe');
        const fakePrice = {
            id: 'price_1',
            product: '',
            active: true,
            nickname: 'Complimentary',
            unit_amount: 0,
            currency: 'usd',
            type: 'recurring',
            recurring: {
                interval: 'year'
            }
        };
        const fakeSubscription = {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            metadata: {},
            current_period_end: Date.now() / 1000,
            start_date: Date.now() / 1000,
            plan: fakePrice,
            items: {
                data: [{
                    price: fakePrice
                }]
            }
        };
        sinon.stub(stripeService.api, 'createCustomer').callsFake(async function (data) {
            return {
                id: 'cus_1',
                email: data.email
            };
        });
        sinon.stub(stripeService.api, 'createPrice').resolves(fakePrice);
        sinon.stub(stripeService.api, 'createSubscription').resolves(fakeSubscription);
        sinon.stub(stripeService.api, 'getSubscription').resolves(fakeSubscription);
        const initialMember = {
            name: 'Name',
            email: 'compedtest@test.com',
            newsletters: [newsletters[0]]
        };

        const compedPayload = {
            comped: true
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(buildMemberMatcherShallowIncludesWithTiers(1))
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'free'
            }, {
                from_status: 'free',
                to_status: 'comped'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin',
                newsletter_id: newsletters[0].id
            }]
        });
    });

    it('Can add complimentary subscription by assigning a product to a member', async function () {
        const initialMember = {
            name: 'Name',
            email: 'compedtest2@test.com',
            newsletters: [newsletters[0]]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201);

        const newMember = body.members[0];
        assert.equal(newMember.status, 'free', 'A new member should have the free status');

        const product = await getPaidProduct();

        const compedPayload = {
            id: newMember.id,
            email: newMember.email,
            tiers: [
                {
                    id: product.id
                }
            ]
        };

        const {body: body2} = await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200);

        const updatedMember = body2.members[0];
        assert.equal(updatedMember.status, 'comped', 'A comped member should have the comped status');
        assert.equal(updatedMember.tiers.length, 1, 'The member should have one product');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                },
                {
                    from_status: 'free',
                    to_status: 'comped'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin',
                newsletter_id: newsletters[0].id
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can end a complimentary subscription by removing a product from a member', async function () {
        const product = await getPaidProduct();
        const initialMember = {
            name: 'Name',
            email: 'compedtest3@test.com',
            newsletters: [newsletters[0]],
            tiers: [
                {
                    id: product.id
                }
            ]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201);

        const newMember = body.members[0];
        assert.equal(newMember.status, 'comped', 'The new member should have the comped status');
        assert.equal(newMember.tiers.length, 1, 'The member should have 1 product');

        // Remove it
        const removePayload = {
            id: newMember.id,
            email: newMember.email,
            tiers: []
        };

        const {body: body2} = await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [removePayload]})
            .expectStatus(200);

        const updatedMember = body2.members[0];
        assert.equal(updatedMember.status, 'free', 'The member should have the free status');
        assert.equal(updatedMember.tiers.length, 0, 'The member should have 0 tiers');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'comped'
                },
                {
                    from_status: 'comped',
                    to_status: 'free'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[0].id
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can create a new member with a product (complimentary)', async function () {
        const product = await getPaidProduct();
        const initialMember = {
            name: 'Name',
            email: 'compedtest4@test.com',
            subscribed: true,
            newsletters: [newsletters[0]],
            tiers: [
                {
                    id: product.id
                }
            ]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    tiers: new Array(1).fill({
                        id: anyObjectId,
                        monthly_price_id: anyObjectId,
                        yearly_price_id: anyObjectId,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }),
                    newsletters: new Array(1).fill(newsletterSnapshot)
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];
        assert.equal(newMember.status, 'comped', 'The newly imported member should have the comped status');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'comped'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can create a member with an existing complimentary subscription', async function () {
        const fakePrice = {
            id: 'price_1',
            product: '',
            active: true,
            nickname: 'Complimentary',
            unit_amount: 0,
            currency: 'usd',
            type: 'recurring',
            recurring: {
                interval: 'year'
            }
        };

        const fakeSubscription = {
            id: 'sub_2',
            customer: 'cus_1234',
            status: 'active',
            cancel_at_period_end: false,
            metadata: {},
            current_period_end: Date.now() / 1000 + 1000,
            start_date: Date.now() / 1000,
            plan: fakePrice,
            items: {
                data: [{
                    price: fakePrice
                }]
            }
        };

        const fakeCustomer = {
            id: 'cus_1234',
            name: 'Test Member',
            email: 'create-member-comped-test@email.com',
            subscriptions: {
                type: 'list',
                data: [fakeSubscription]
            }
        };
        stripeMocker.customers.push(fakeCustomer);
        stripeMocker.subscriptions.push(fakeSubscription);
        stripeMocker.prices.push(fakePrice);

        const initialMember = {
            name: fakeCustomer.name,
            email: fakeCustomer.email,
            subscribed: true,
            newsletters: [newsletters[0]],
            stripe_customer_id: fakeCustomer.id
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    tiers: new Array(1).fill(tierMatcher),
                    newsletters: new Array(1).fill(newsletterSnapshot)
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];
        assert.equal(newMember.status, 'comped', 'The created member should have the comped status');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                },
                {
                    from_status: 'free',
                    to_status: 'comped'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: [{
                mrr_delta: 0
            }]
        });
    });

    let memberWithPaidSubscription;

    it('Can create a member with an existing paid subscription', async function () {
        const fakePrice = {
            id: 'price_1',
            product: 'product_1234',
            active: true,
            nickname: 'Paid',
            unit_amount: 1200,
            currency: 'usd',
            type: 'recurring',
            recurring: {
                interval: 'year'
            }
        };

        const fakeSubscription = {
            id: 'sub_987623',
            customer: 'cus_12345',
            status: 'active',
            cancel_at_period_end: false,
            metadata: {},
            current_period_end: Date.now() / 1000 + 1000,
            start_date: Date.now() / 1000,
            plan: fakePrice,
            items: {
                data: [{
                    id: 'item_123',
                    price: fakePrice
                }]
            }
        };

        const fakeCustomer = {
            id: 'cus_12345',
            name: 'Test Member',
            email: 'create-member-paid-test@email.com',
            subscriptions: {
                type: 'list',
                data: [fakeSubscription]
            }
        };

        stripeMocker.customers.push(fakeCustomer);
        stripeMocker.subscriptions.push(fakeSubscription);
        stripeMocker.prices.push(fakePrice);

        const initialMember = {
            name: fakeCustomer.name,
            email: fakeCustomer.email,
            subscribed: true,
            newsletters: [newsletters[0]],
            stripe_customer_id: fakeCustomer.id
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    tiers: new Array(1).fill(tierMatcher),
                    newsletters: new Array(1).fill(newsletterSnapshot)
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];

        assert.equal(newMember.status, 'paid', 'The created member should have the paid status');
        assert.equal(newMember.subscriptions.length, 1, 'The member should have a single subscription');
        assert.equal(newMember.subscriptions[0].id, fakeSubscription.id, 'The returned subscription should have an ID assigned');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }, {
                    from_status: 'free',
                    to_status: 'paid'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: [
                {
                    mrr_delta: 100
                }
            ]
        });

        await assertSubscription(fakeSubscription.id, {
            subscription_id: fakeSubscription.id,
            status: 'active',
            cancel_at_period_end: false,
            plan_amount: 1200,
            plan_interval: 'year',
            plan_currency: 'usd',
            mrr: 100
        });

        // Save this member for the next tests
        memberWithPaidSubscription = newMember;
    });

    it('Returns an identical member format for read, edit and browse', async function () {
        if (!memberWithPaidSubscription) {
            // Previous test failed
            this.skip();
        }

        // Check status has been updated to 'free' after cancelling
        const {body: readBody} = await agent.get('/members/' + memberWithPaidSubscription.id + '/');
        assert.equal(readBody.members.length, 1, 'The member was not found in read');
        const readMember = readBody.members[0];

        // Note that we explicitly need to ask to include tiers while browsing
        const {body: browseBody} = await agent.get(`/members/?search=${memberWithPaidSubscription.email}&include=tiers`);
        assert.equal(browseBody.members.length, 1, 'The member was not found in browse');
        const browseMember = browseBody.members[0];

        // Ignore attribution for now
        delete readMember.attribution;
        for (const sub of readMember.subscriptions) {
            delete sub.attribution;
        }

        // Ignore attribution for now
        delete memberWithPaidSubscription.attribution;
        for (const sub of memberWithPaidSubscription.subscriptions) {
            delete sub.attribution;
        }

        // Check for this member with a paid subscription that the body results for the patch, get and browse endpoints are 100% identical
        should.deepEqual(browseMember, readMember, 'Browsing a member returns a different format than reading a member');
        should.deepEqual(memberWithPaidSubscription, readMember, 'Editing a member returns a different format than reading a member');
    });

    it('Cannot add complimentary subscriptions to a member with an active subscription', async function () {
        if (!memberWithPaidSubscription) {
            // Previous test failed
            this.skip();
        }
        const product = await getOtherPaidProduct();

        const compedPayload = {
            id: memberWithPaidSubscription.id,
            tiers: [
                ...memberWithPaidSubscription.tiers,
                {
                    id: product.id
                }
            ]
        };

        sinon.stub(logging, 'error');
        await agent
            .put(`/members/${memberWithPaidSubscription.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(400);
    });

    it('Cannot remove non complimentary subscriptions directly from a member', async function () {
        if (!memberWithPaidSubscription) {
            // Previous test failed
            this.skip();
        }

        const compedPayload = {
            id: memberWithPaidSubscription.id,
            // Remove all paid subscriptions (= not allowed atm)
            tiers: []
        };

        sinon.stub(logging, 'error');
        await agent
            .put(`/members/${memberWithPaidSubscription.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(400);
    });

    it('Can remove a complimentary subscription directly from a member with other active subscriptions', async function () {
        // This tests for an edge case that shouldn't be possible, but the API should support this to resolve issues
        // refs https://github.com/TryGhost/Team/issues/1859

        if (!memberWithPaidSubscription) {
            // Previous test failed
            this.skip();
        }

        // Check that the product that we are going to add is not the same as the existing one
        const product = await getOtherPaidProduct();
        should(memberWithPaidSubscription.tiers).have.length(1);
        should(memberWithPaidSubscription.tiers[0].id).not.eql(product.id);

        // Add it manually
        await models.Member.edit({
            products: [
                ...memberWithPaidSubscription.tiers,
                {
                    id: product.id
                }
            ]
        }, {id: memberWithPaidSubscription.id});

        // Check status
        const {body: body2} = await agent
            .get(`/members/${memberWithPaidSubscription.id}/`)
            .expectStatus(200);

        const beforeMember = body2.members[0];
        assert.equal(beforeMember.tiers.length, 2, 'The member should have two tiers now');

        // Now try to remove only the complimentary one
        const compedPayload = {
            id: memberWithPaidSubscription.id,
            // Remove all complimentary subscriptions
            tiers: memberWithPaidSubscription.tiers
        };

        const {body} = await agent
            .put(`/members/${memberWithPaidSubscription.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200);

        const updatedMember = body.members[0];
        assert.equal(updatedMember.status, 'paid', 'Member should still have the paid status');
        assert.equal(updatedMember.tiers.length, 1, 'The member should have one product now');
        assert.equal(updatedMember.tiers[0].id, memberWithPaidSubscription.tiers[0].id, 'The member should have the paid product');
    });

    it('Can keep tiers unchanged when modifying a paid member', async function () {
        if (!memberWithPaidSubscription) {
            // Previous test failed
            this.skip();
        }

        const compedPayload = {
            id: memberWithPaidSubscription.id,
            // Not changed tiers
            tiers: [...memberWithPaidSubscription.tiers]
        };

        await agent
            .put(`/members/${memberWithPaidSubscription.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200);
    });

    it('Can edit by id', async function () {
        const memberToChange = {
            name: 'change me',
            email: 'member2Change@test.com',
            note: 'initial note',
            newsletters: [
                newsletters[0]
            ]
        };

        const memberChanged = {
            name: 'changed',
            email: 'cantChangeMe@test.com',
            note: 'edited note',
            newsletters: []
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const newMember = body.members[0];

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin',
                newsletter_id: newsletters[0].id
            }]
        });
        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'free'
            }]
        });

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await assertMemberEvents({
            eventType: 'MemberEmailChangeEvent',
            memberId: newMember.id,
            asserts: [{
                from_email: memberToChange.email,
                to_email: memberChanged.email
            }]
        });
        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[0].id
                }, {
                    subscribed: false,
                    source: 'admin',
                    newsletter_id: newsletters[0].id
                }
            ]
        });
    });

    // Internally a different error is thrown for newsletters/tiers changes
    it('Cannot edit a non-existing id with newsletters', async function () {
        const memberChanged = {
            name: 'changed',
            email: 'just-a-member@test.com',
            newsletters: []
        };

        await agent
            .put(`/members/${ObjectId().toHexString()}/`)
            .body({members: [memberChanged]})
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid,
                    context: anyString
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Cannot edit a non-existing id', async function () {
        const memberChanged = {
            name: 'changed',
            email: 'just-a-member@test.com'
        };

        await agent
            .put(`/members/${ObjectId().toHexString()}/`)
            .body({members: [memberChanged]})
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid,
                    context: anyString
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can subscribe to a newsletter', async function () {
        const clock = sinon.useFakeTimers(Date.now());
        const memberToChange = {
            name: 'change me',
            email: 'member3change@test.com',
            newsletters: [
                newsletters[0]
            ]
        };

        const memberChanged = {
            newsletters: [
                newsletters[1]
            ]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const newMember = body.members[0];
        const before = new Date();
        before.setMilliseconds(0);

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin',
                newsletter_id: newsletters[0].id,
                created_at: before
            }]
        });

        // Wait 5 seconds to guarantee event ordering
        clock.tick(5000);

        const after = new Date();
        after.setMilliseconds(0);

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[0].id,
                    created_at: before
                }, {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[1].id,
                    created_at: after
                }, {
                    subscribed: false,
                    source: 'admin',
                    newsletter_id: newsletters[0].id,
                    created_at: after
                }
            ]
        });

        clock.tick(5000);

        // Check activity feed
        const {body: eventsBody} = await agent
            .get(`/members/events?filter=data.member_id:${newMember.id}`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const events = eventsBody.events;

        // The order will be different in each test because two newsletter_events have the same created_at timestamp. And events are ordered by created_at desc, id desc (id will be different each time).
        matchArrayWithoutOrder(events, [
            {
                type: 'newsletter_event',
                data: {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[1].id,
                    newsletter: {
                        id: newsletters[1].id
                    }
                }
            },
            {
                type: 'newsletter_event',
                data: {
                    subscribed: false,
                    source: 'admin',
                    newsletter_id: newsletters[0].id,
                    newsletter: {
                        id: newsletters[0].id
                    }
                }
            },
            {
                type: 'signup_event'
            },
            {
                type: 'newsletter_event',
                data: {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[0].id,
                    newsletter: {
                        id: newsletters[0].id
                    }
                }
            }
        ]);

        clock.restore();
    });

    it('Subscribes to default newsletters', async function () {
        const filtered = newsletters.filter(n => n.get('subscribe_on_signup'));
        filtered.length.should.be.greaterThan(0, 'There should be at least one newsletter with subscribe on signup for this test to work');

        const memberToCreate = {
            name: 'create me',
            email: 'member2create@test.com'
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToCreate]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];
        newMember.newsletters.should.match([
            {
                id: filtered[0].id
            },
            {
                id: filtered[1].id
            }
        ]);

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: filtered.map((n) => {
                return {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: n.id
                };
            })
        });
    });

    it('Can add a subscription', async function () {
        const memberId = testUtils.DataGenerator.Content.members[0].id;

        // Get the stripe price ID of the default price for month
        const price = await stripeMocker.getPriceForTier('default-product', 'month');

        await agent
            .post(`/members/${memberId}/subscriptions/`)
            .body({
                stripe_price_id: price.id
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: [subscriptionSnapshotWithTier],
                    newsletters: anyArray,
                    tiers: [tierSnapshot]
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Check member read with a subscription
        await agent
            .get(`/members/${memberId}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: [subscriptionSnapshotWithTier],
                    newsletters: anyArray,
                    tiers: [tierSnapshot]
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can edit a subscription', async function () {
        const memberId = testUtils.DataGenerator.Content.members[1].id;

        // Get the stripe price ID of the default price for month
        const price = await stripeMocker.getPriceForTier('default-product', 'year');

        const res = await agent
            .post(`/members/${memberId}/subscriptions/`)
            .body({
                stripe_price_id: price.id
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: [subscriptionSnapshotWithTier],
                    newsletters: anyArray,
                    tiers: [tierSnapshot]
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const subscriptionId = res.body.members[0].subscriptions[0].id;

        const editRes = await agent
            .put(`/members/${memberId}/subscriptions/${subscriptionId}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: [subscriptionSnapshot],
                    newsletters: anyArray,
                    tiers: []
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        assert.equal('canceled', editRes.body.members[0].subscriptions[0].status);
    });

    // Delete a member

    it('Can destroy', async function () {
        const member = {
            name: 'test',
            email: 'memberTestDestroy@test.com'
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];

        await agent
            .delete(`/members/${newMember.id}`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await agent
            .get(`/members/${newMember.id}/`)
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Cannot delete a non-existent member', async function () {
        await agent
            .delete('/members/abcd1234abcd1234abcd1234')
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    // Export members to CSV

    it('Can export CSV', async function () {
        const res = await agent
            .get(`/members/upload/?limit=all`)
            .expectStatus(200)
            .expectEmptyBody() // express-test body parsing doesn't support CSV
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion,
                'content-length': anyContentLength,
                'content-disposition': anyString
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.exist(csv.data.find(row => row.name === 'Winston Zeddemore'));
        should.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.exist(csv.data.find(row => row.email === 'member2@test.com'));
        should.exist(csv.data.find(row => row.tiers.length > 0));
        should.exist(csv.data.find(row => row.labels.length > 0));
    });

    it('Can export a filtered CSV', async function () {
        const res = await agent
            .get(`/members/upload/?search=Egg`)
            .expectStatus(200)
            .expectEmptyBody() // express-test body parsing doesn't support CSV
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion,
                'content-disposition': anyString
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.not.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.not.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.not.exist(csv.data.find(row => row.email === 'member2@test.com'));
        // note that this member doesn't have tiers
        should.exist(csv.data.find(row => row.labels.length > 0));
    });

    it('Can delete a member without cancelling Stripe Subscription', async function () {
        let subscriptionCanceled = false;
        mockManager.restore();
        nock('https://api.stripe.com')
            .persist()
            .delete(/v1\/.*/)
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)(?:\/(\w+))/) || [null];

                if (match && resource === 'subscriptions') {
                    subscriptionCanceled = true;
                    return [200, {
                        id,
                        status: 'canceled'
                    }];
                }

                return [500];
            });

        // @TODO This is wrong because it changes the state for the rest of the tests
        // We need to add a member via a fixture and then remove them OR work out how
        // to reapply fixtures before each test
        const memberToDelete = fixtureManager.get('members', 2);

        await agent
            .delete(`members/${memberToDelete.id}/`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        assert.equal(subscriptionCanceled, false, 'expected subscription not to be canceled');
    });

    it('Can delete a member while cancelling Stripe Subscription', async function () {
        let subscriptionCanceled = false;
        mockManager.restore();
        nock('https://api.stripe.com')
            .persist()
            .delete(/v1\/.*/)
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)(?:\/(\w+))/) || [null];

                if (match && resource === 'subscriptions') {
                    subscriptionCanceled = true;
                    return [200, {
                        id,
                        status: 'canceled'
                    }];
                }

                return [500];
            });

        // @TODO This is wrong because it changes the state for the rest of the tests
        // We need to add a member via a fixture and then remove them OR work out how
        // to reapply fixtures before each test
        const memberToDelete = fixtureManager.get('members', 3);

        await agent
            .delete(`members/${memberToDelete.id}/?cancel=true`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        assert.equal(subscriptionCanceled, true, 'expected subscription to be canceled');
    });

    // Get stats

    it('Can fetch member counts stats', async function () {
        await agent
            .get(`/members/stats/count/`)
            .expectStatus(200)
            .matchBodySnapshot({
                data: [{
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Errors when fetching stats with unknown days param value', async function () {
        sinon.stub(logging, 'error');
        await agent
            .get('members/stats/?days=nope')
            .expectStatus(422)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });

    it('Can filter on newsletter slug', async function () {
        await agent
            .get('/members/?filter=newsletters:weekly-newsletter')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(3).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can filter on tier slug', async function () {
        await agent
            .get('/members/?include=tiers&filter=tier:default-product')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(8).fill(buildMemberMatcherShallowIncludesWithTiers())
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    // Edit a member
    it('Can add and edit with custom newsletters', async function () {
        // Add custom newsletter list to new member
        const member = {
            name: 'test newsletter',
            email: 'memberTestAddNewsletter2@test.com',
            note: 'test note',
            subscribed: false,
            labels: ['test-label'],
            newsletters: [{id: testUtils.DataGenerator.Content.newsletters[1].id}]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(1).fill(newsletterSnapshot)
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const memberId = body.members[0].id;
        const editedMember = {
            newsletters: [{id: testUtils.DataGenerator.Content.newsletters[0].id}]
        };

        // Edit newsletter list for member
        await agent
            .put(`/members/${memberId}`)
            .body({members: [editedMember]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(1).fill(newsletterSnapshot)
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        sinon.stub(logging, 'error');
        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(422);
    });

    it('Setting subscribed when editing a member won\'t reset to default newsletters', async function () {
        // First check that this newsletter is off by default, or this test would not make sense
        const newsletter = await models.Newsletter.findOne({id: testUtils.DataGenerator.Content.newsletters[0].id}, {require: true});
        assert.equal(newsletter.get('subscribe_on_signup'), false, 'This test expects the newsletter to be off by default');

        // Add custom newsletter list to new member
        const member = {
            name: 'test newsletter',
            email: 'memberTestChangeSubscribedAttribute@test.com',
            newsletters: [
                {
                    id: testUtils.DataGenerator.Content.newsletters[0].id // This is off by default
                },
                {
                    id: testUtils.DataGenerator.Content.newsletters[1].id
                }
            ]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(2).fill(newsletterSnapshot)
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const memberId = body.members[0].id;

        const editedMember = {
            subscribed: true // no change
        };

        // Edit member
        const {body: body2} = await agent
            .put(`/members/${memberId}`)
            .body({members: [editedMember]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(2).fill(newsletterSnapshot)
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
        const changedMember = body2.members[0];
        assert.equal(changedMember.newsletters.length, 2);
        assert.ok(changedMember.newsletters.find(n => n.id === testUtils.DataGenerator.Content.newsletters[0].id), 'The member is still subscribed for a newsletter that is off by default');
        assert.ok(changedMember.newsletters.find(n => n.id === testUtils.DataGenerator.Content.newsletters[1].id), 'The member is still subscribed for the newsletter it subscribed to');
    });

    it('Adding newsletters to member with no subscriptions works even with subscribed false', async function () {
        // Add member with no subscriptions
        const member = {
            name: 'test newsletter',
            email: 'memberAddNewsletterSubscribed@test.com',
            newsletters: []
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(0).fill(newsletterSnapshot)
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const memberId = body.members[0].id;

        const editedMember = {
            subscribed: false,
            newsletters: [
                {
                    id: testUtils.DataGenerator.Content.newsletters[0].id
                }
            ]
        };

        // Edit member
        const {body: body2} = await agent
            .put(`/members/${memberId}`)
            .body({members: [editedMember]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(1).fill(newsletterSnapshot)
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
        const changedMember = body2.members[0];
        assert.equal(changedMember.newsletters.length, 1);
        assert.ok(changedMember.newsletters.find(n => n.id === testUtils.DataGenerator.Content.newsletters[0].id), 'The member should be subscribed to the newsletter');
    });

    it('Updating member data without newsletters does not change newsletters', async function () {
        // check that this newsletter is archived, or this test would not make sense
        const archivedNewsletterId = testUtils.DataGenerator.Content.newsletters[2].id;
        const archivedNewsletter = await models.Newsletter.findOne({id: archivedNewsletterId}, {require: true});
        assert.equal(archivedNewsletter.get('status'), 'archived', 'This test expects the newsletter to be archived');

        const member = await models.Member.findOne({id: testUtils.DataGenerator.Content.members[5].id}, {withRelated: ['newsletters']});
        const memberNewsletters = member.related('newsletters').models;
        // NOTE: removed this call for now; it's not necessary as it's just 'bonus validation' before executing the api calls
        //  unfortunately it led to some issues where the object id was not in sync between fixture data and the db (unsure of cause)
        // assert.equal(memberNewsletters[1].id, archivedNewsletterId, 'This test expects the member to be subscribed to an archived newsletter');
        assert.equal(memberNewsletters.length, 2, 'This test expects the member to have two newsletter subscriptions');

        const memberId = member.get('id');
        const editedMember = {
            id: memberId,
            name: 'new name'
        };

        // edit member
        const {body} = await agent
            .put(`/members/${memberId}`)
            .body({members: [editedMember]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(1).fill(newsletterSnapshot)
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const changedMember = body.members[0];
        assert.equal(changedMember.newsletters.length, 1); // the api only returns active newsletters
        assert.ok(changedMember.newsletters.find(n => n.id === testUtils.DataGenerator.Content.newsletters[1].id), 'The member is still subscribed to an active newsletter');

        const changedMemberFromDb = await models.Member.findOne({id: testUtils.DataGenerator.Content.members[5].id}, {withRelated: ['newsletters']});
        assert.ok(changedMemberFromDb.related('newsletters').models.find(n => n.id === testUtils.DataGenerator.Content.newsletters[2].id), 'The member is still subscribed to the archived newsletter it subscribed to');
    });

    it('Updating newsletter subscriptions does not unsubscribe member from archived newsletter', async function () {
        // check that this newsletter is archived, or this test would not make sense
        const archivedNewsletterId = testUtils.DataGenerator.Content.newsletters[2].id;
        const archivedNewsletter = await models.Newsletter.findOne({id: archivedNewsletterId}, {require: true});
        assert.equal(archivedNewsletter.get('status'), 'archived', 'This test expects the newsletter to be archived');

        const member = await models.Member.findOne({id: testUtils.DataGenerator.Content.members[5].id}, {withRelated: ['newsletters']});
        const memberNewsletters = member.related('newsletters').models;
        // NOTE: removed this call for now; it's not necessary as it's just 'bonus validation' before executing the api calls
        //  unfortunately it led to some issues where the object id was not in sync between fixture data and the db (unsure of cause)
        // assert.equal(memberNewsletters[1].id, archivedNewsletterId, 'This test expects the member to be subscribed to an archived newsletter');
        assert.equal(memberNewsletters.length, 2, 'This test expects the member to have two newsletter subscriptions');

        // remove active newsletter subscriptions
        const memberId = member.get('id');
        const editedMember = {
            newsletters: []
        };

        // edit member
        const {body} = await agent
            .put(`/members/${memberId}`)
            .body({members: [editedMember]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: anyArray
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const changedMember = body.members[0];
        assert.equal(changedMember.newsletters.length, 0); // the api only returns active newsletters, so this member should have none

        const changedMemberFromDb = await models.Member.findOne({id: testUtils.DataGenerator.Content.members[5].id}, {withRelated: ['newsletters']});
        assert.ok(changedMemberFromDb.related('newsletters').models.find(n => n.id === testUtils.DataGenerator.Content.newsletters[2].id), 'The member is still subscribed to the archived newsletter it subscribed to');
    });

    it('Can add and send a signup confirmation email (old)', async function () {
        const filteredNewsletters = newsletters.filter(n => n.get('subscribe_on_signup'));
        filteredNewsletters.length.should.be.greaterThan(0, 'For this test to work, we need at least one newsletter fixture with subscribe_on_signup = true');

        const member = {
            name: 'Send Me Confirmation',
            email: 'member_getting_confirmation_old@test.com',
            // Mapped to subscribe_on_signup newsletters
            subscribed: true
        };

        const {body} = await agent
            .post('/members/?send_email=true&email_type=signup')
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [
                    buildMemberWithoutIncludesSnapshot({
                        newsletters: filteredNewsletters.length
                    })
                ]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyString
            });

        const newMember = body.members[0];

        mockManager.assert.sentEmail({
            subject: '🙌 Complete your sign up to Ghost!',
            to: 'member_getting_confirmation_old@test.com'
        });

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: filteredNewsletters.map((n) => {
                return {
                    subscribed: true,
                    newsletter_id: n.id,
                    source: 'admin'
                };
            })
        });

        // @TODO: do we really need to delete this member here?
        await agent
            .delete(`members/${body.members[0].id}/`)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .expectStatus(204);

        // There should be no MemberSubscribeEvent remaining.
        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can add a member that is not subscribed (old)', async function () {
        const filteredNewsletters = newsletters.filter(n => n.get('subscribe_on_signup'));
        filteredNewsletters.length.should.be.greaterThan(0, 'For this test to work, we need at least one newsletter fixture with subscribe_on_signup = true');

        const member = {
            name: 'Send Me Confirmation',
            email: 'member_getting_confirmation_old_2@test.com',
            // Mapped to empty newsletters
            subscribed: false
        };

        const {body} = await agent
            .post('/members/?send_email=true&email_type=signup')
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [
                    buildMemberWithoutIncludesSnapshot({
                        newsletters: 0
                    })
                ]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyString
            });

        const newMember = body.members[0];

        mockManager.assert.sentEmail({
            subject: '🙌 Complete your sign up to Ghost!',
            to: 'member_getting_confirmation_old_2@test.com'
        });

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can unsubscribe by setting (old) subscribed property to false', async function () {
        const memberToChange = {
            name: 'change me',
            email: 'member2unsusbcribeold@test.com',
            note: 'initial note',
            newsletters: [
                newsletters[0]
            ]
        };

        const memberChanged = {
            subscribed: false
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [
                    buildMemberWithIncludesSnapshot({
                        newsletters: 1
                    })
                ]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const newMember = body.members[0];

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin',
                newsletter_id: newsletters[0].id
            }]
        });
        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'free'
            }]
        });

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [
                    buildMemberWithIncludesSnapshot({
                        newsletters: 0
                    })
                ]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: newsletters[0].id
                }, {
                    subscribed: false,
                    source: 'admin',
                    newsletter_id: newsletters[0].id
                }
            ]
        });
    });

    it('Can subscribe by setting (old) subscribed property to true', async function () {
        const filteredNewsletters = newsletters.filter(n => n.get('subscribe_on_signup'));
        filteredNewsletters.length.should.be.greaterThan(0, 'For this test to work, we need at least one newsletter fixture with subscribe_on_signup = true');

        const memberToChange = {
            name: 'change me',
            email: 'member2subscribe@test.com',
            note: 'initial note',
            newsletters: []
        };

        const memberChanged = {
            subscribed: true
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [
                    buildMemberWithIncludesSnapshot({
                        newsletters: 0
                    })
                ]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const newMember = body.members[0];

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: []
        });
        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'free'
            }]
        });

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [
                    buildMemberWithIncludesSnapshot({
                        newsletters: filteredNewsletters.length
                    })
                ]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: filteredNewsletters.map((n) => {
                return {
                    subscribed: true,
                    source: 'admin',
                    newsletter_id: n.id
                };
            })
        });
    });
});

describe('Members API Bulk operations', function () {
    beforeEach(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();

        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can bulk unsubscribe members with filter', async function () {
        // This member has 2 subscriptions
        const member = fixtureManager.get('members', 4);
        const newsletterCount = 2;

        const model = await models.Member.findOne({id: member.id}, {withRelated: 'newsletters'});
        should(model.relations.newsletters.models.length).equal(newsletterCount, 'This test requires a member with 2 or more newsletters');

        await agent
            .put(`/members/bulk/?filter=id:${member.id}`)
            .body({bulk: {
                action: 'unsubscribe'
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            // Should contain the count of members, not the newsletter count!
                            successful: 1,
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const updatedModel = await models.Member.findOne({id: member.id}, {withRelated: 'newsletters'});
        should(updatedModel.relations.newsletters.models.length).equal(0, 'This member should be unsubscribed from all newsletters');

        // When we do it again, we should still receive a count of 1, because we unsubcribed one member (who happens to be already unsubscribed)
        await agent
            .put(`/members/bulk/?filter=id:${member.id}`)
            .body({bulk: {
                action: 'unsubscribe'
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            // Should contain the count of members, not the newsletter count!
                            successful: 1,
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can bulk unsubscribe members from specific newsletter', async function () {
        const member = fixtureManager.get('members', 4);
        const newsletterCount = 2;

        const model = await models.Member.findOne({id: member.id}, {withRelated: 'newsletters'});
        should(model.relations.newsletters.models.length).equal(newsletterCount, 'This test requires a member with 2 or more newsletters');

        await agent
            .put(`/members/bulk/?all=true`)
            .body({bulk: {
                action: 'unsubscribe',
                newsletter: model.relations.newsletters.models[0].id,
                meta: {}
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            successful: 4,
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            });
        const updatedModel = await models.Member.findOne({id: member.id}, {withRelated: 'newsletters'});
        // ensure they were unsubscribed from the single 'chosen' newsletter
        should(updatedModel.relations.newsletters.models.length).equal(newsletterCount - 1);
    });

    it('Can bulk unsubscribe members with deprecated subscribed filter', async function () {
        await agent
            .put(`/members/bulk/?filter=subscribed:false`)
            .body({bulk: {
                action: 'unsubscribe'
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            successful: 2, // We have two members who are subscribed to an inactive newsletter
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can bulk unsubscribe members with deprecated subscribed filter (actual)', async function () {
        // This member is subscribed to an inactive newsletter
        const ignoredMember = fixtureManager.get('members', 6);

        await agent
            .put(`/members/bulk/?filter=subscribed:true`)
            .body({bulk: {
                action: 'unsubscribe'
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            successful: 6, // not 7 because members subscribed to an inactive newsletter aren't subscribed (newsletter fixture[2])
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const allMembers = await models.Member.findAll({withRelated: 'newsletters'});
        for (const model of allMembers) {
            if (model.id === ignoredMember.id) {
                continue;
            }
            should(model.relations.newsletters.models.length).equal(0, 'This member should be unsubscribed from all newsletters');
        }
    });

    it('Can bulk delete a label from members', async function () {
        await agent
            .put(`/members/bulk/?all=true`)
            .body({bulk: {
                action: 'removeLabel',
                meta: {
                    label: {
                        // Note! this equals DataGenerator.Content.labels[2]
                        // the index is different in the fixtureManager
                        id: fixtureManager.get('labels', 1).id
                    }
                }
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            successful: 2,
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await agent
            .put(`/members/bulk/?all=true`)
            .body({bulk: {
                action: 'removeLabel',
                meta: {
                    label: {
                        id: fixtureManager.get('labels', 0).id
                    }
                }
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            successful: 1,
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it(`Doesn't delete labels apart from the passed label id`, async function () {
        const member = fixtureManager.get('members', 1);

        // Manually add 2 labels to a member
        await models.Member.edit({labels: [{name: 'first-tag'}, {name: 'second-tag'}]}, {id: member.id});
        const model = await models.Member.findOne({id: member.id}, {withRelated: 'labels'});
        should(model.relations.labels.models.map(m => m.get('name'))).match(['first-tag', 'second-tag']);

        const firstId = model.relations.labels.models[0].id;
        const secondId = model.relations.labels.models[1].id;

        // Delete first label only
        await agent
            .put(`/members/bulk/?all=true`)
            .body({bulk: {
                action: 'removeLabel',
                meta: {
                    label: {
                        id: secondId
                    }
                }
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            successful: 1,
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const updatedModel = await models.Member.findOne({id: member.id}, {withRelated: 'labels'});
        should(updatedModel.relations.labels.models.map(m => m.id)).match([firstId]);
    });

    it('Can bulk delete a label from members with filters', async function () {
        const member1 = fixtureManager.get('members', 0);
        const member2 = fixtureManager.get('members', 1);

        // Manually add 2 labels to a member
        await models.Member.edit({labels: [{name: 'first-tag'}, {name: 'second-tag'}]}, {id: member1.id});
        const model1 = await models.Member.findOne({id: member1.id}, {withRelated: 'labels'});
        should(model1.relations.labels.models.map(m => m.get('name'))).match(['first-tag', 'second-tag']);

        const firstId = model1.relations.labels.models[0].id;
        const secondId = model1.relations.labels.models[1].id;

        await models.Member.edit({labels: [{name: 'first-tag'}, {name: 'second-tag'}]}, {id: member2.id});
        const model2 = await models.Member.findOne({id: member2.id}, {withRelated: 'labels'});
        should(model2.relations.labels.models.map(m => m.id)).match([firstId, secondId]);

        await agent
            .put(`/members/bulk/?filter=id:${member1.id}`)
            .body({bulk: {
                action: 'removeLabel',
                meta: {
                    label: {
                        // Note! this equals DataGenerator.Content.labels[2]
                        // the index is different in the fixtureManager
                        id: firstId
                    }
                }
            }})
            .expectStatus(200)
            .matchBodySnapshot({
                bulk: {
                    meta: {
                        stats: {
                            successful: 1,
                            unsuccessful: 0
                        },
                        unsuccessfulData: [],
                        errors: []
                    }
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const updatedModel1 = await models.Member.findOne({id: member1.id}, {withRelated: 'labels'});
        should(updatedModel1.relations.labels.models.map(m => m.id)).match([secondId]);

        const updatedModel2 = await models.Member.findOne({id: member2.id}, {withRelated: 'labels'});
        should(updatedModel2.relations.labels.models.map(m => m.id)).match([firstId, secondId]);
    });

    it('Can bulk delete members', async function () {
        await agent
            .delete('/members?all=true')
            .expectStatus(200)
            .matchBodySnapshot({
                meta: {
                    stats: {
                        successful: 8,
                        unsuccessful: 0
                    },
                    unsuccessfulIds: [],
                    errors: []
                }
            });
    });
});
