const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyDate, anyString, anyArray} = matchers;

const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const Papa = require('papaparse');

let agent;

describe('Members API', function () {
    let request;
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleProducts');
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });

    it('Can browse', async function () {
        await agent
            .get('/members/')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(8).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse with filter', async function () {
        await agent
            .get('/members/?filter=label:label-1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse with search', async function () {
        await agent
            .get('/members/?search=member1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can filter by paid status', async function () {
        await agent
            .get('/members/?filter=status:paid')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(5).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read and include email_recipients', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/?include=email_recipients`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch member counts stats', async function () {
        await agent
            .get(`/members/stats/count/`)
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can add', async function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com',
            note: 'test note',
            subscribed: false,
            labels: ['test-label']
        };

        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(422);
    });

    it('Can add complimentary subscription', async function () {
        const stripeService = require('../../../core/server/services/stripe');
        const fakePrice = {
            id: 'price_1',
            product: '',
            active: true,
            nickname: 'Complimentary',
            unit_amount: 0,
            currency: 'USD',
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
            subscribed: true
        };

        const compedPayload = {
            comped: true
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        const newMember = body.members[0];

        const {body: body2} = await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can edit by id', async function () {
        const memberToChange = {
            name: 'change me',
            email: 'member2Change@test.com',
            note: 'initial note',
            subscribed: true
        };

        const memberChanged = {
            name: 'changed',
            email: 'cantChangeMe@test.com',
            note: 'edited note',
            subscribed: false
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        const newMember = body.members[0];

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

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
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyDate,
                    updated_at: anyDate,
                    labels: anyArray,
                    subscriptions: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString //TODO: validate the exact string?
            });

        const newMember = body.members[0];

        await agent
            .delete(`/members/${newMember.id}`)
            .expectStatus(204)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
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
                etag: anyEtag
            });
    });

    it('Can export CSV', async function () {
        const res = await agent
            .get(`/members/upload/`)
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyString, //For some reason the content-length changes between 1220 and 1317
                'content-disposition': anyString
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });

    it('Can export a filtered CSV', async function () {
        const res = await agent
            .get(`/members/upload/?search=Egg`)
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-disposition': anyString
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.not.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.not.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.not.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });

    it('Can add a subcription', async function () {
        const memberId = testUtils.DataGenerator.Content.members[0].id;
        await agent
            .post(`/members/${memberId}/subscriptions/`)
            .body({
                stripe_price_id: testUtils.DataGenerator.Content.stripe_prices[0].id
            })
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
