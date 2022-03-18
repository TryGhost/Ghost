const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, anyISODate, anyString, anyArray, anyLocationFor, anyErrorId} = matchers;

const assert = require('assert');
const nock = require('nock');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const Papa = require('papaparse');

const models = require('../../../core/server/models');
const { any } = require('bluebird');

let agent;

async function getPaidProduct() {
    return await models.Product.findOne({type: 'paid'});
}

async function getFreeProduct() {
    return await models.Product.findOne({type: 'free'});
}

describe('Offers API', function () {
    let defaultTier;
    let savedOffer;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
        defaultTier = await getPaidProduct();
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Has no initial offers', async function () {
        await agent
            .get(`offers/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: []
            });
    });

    it('Can add a new offer', async function () {
        const newOffer = {
            name: 'Black Friday',
            code: 'black-friday',
            display_title: 'Black Friday Sale!',
            display_description: '10% off on yearly plan',
            type: 'percent',
            cadence: 'year',
            amount: 12,
            duration: 'once',
            duration_in_months: null,
            currency_restriction: false,
            currency: null,
            status: 'active',
            redemption_count: 0,
            tier: {
                id: defaultTier.id
            }
        };
        
        const {body} = await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('offers')
            })
            .matchBodySnapshot({
                offers: [{
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                }]
            });
        savedOffer = body.offers[0];
    });

    it('Can browse', async function () {
        await agent
            .get(`offers/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            });
    });

    /** 
     * @todo: Can browse with filter
     */

    it('Can get a single offer', async function () {
        await agent
            .get(`offers/${savedOffer.id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            });
    });

    it('Can edit an offer', async function () {
        // We can change all fields except discount related fields
        let updatedOffer = {
            name: 'Cyber Monday',
            code: 'cyber-monday',
            display_title: 'Cyber Monday Sale!',
            display_description: '10% off on yearly plan, only today',
        };

        await agent
            .put(`offers/${savedOffer.id}`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            })
            .expect(({body}) => {
                body.offers[0].should.match(updatedOffer);
            });
    });

    it('Can archive an offer', async function () {
        // We can change all fields except discount related fields
        let updatedOffer = {
            status: 'archived'
        };

        await agent
            .put(`offers/${savedOffer.id}`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            })
            .expect(({body}) => {
                body.offers[0].should.match(updatedOffer);
            });
    });

    it('Cannot update offer cadence', async function () {
        // We can change all fields except discount related fields
        let updatedOffer = {
            cadence: 'month'
        };

        await agent
            .put(`offers/${savedOffer.id}`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            })
            .expect(({body}) => {
                body.offers[0].cadence.should.eql('year');
            });
    });

    it('Cannot update offer amount', async function () {
        // We can change all fields except discount related fields
        let updatedOffer = {
            amount: 20
        };

        // No validation errors are thrown at the moment
        await agent
            .put(`offers/${savedOffer.id}`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            })
            .expect(({body}) => {
                body.offers[0].amount.should.eql(12);
            });
    });

    it('Cannot update offer tier', async function () {
        // We can change all fields except discount related fields
        const freeTier = await getFreeProduct();
        let updatedOffer = {
            tier: {
                id: freeTier.id
            }
        };

        // No validation errors are thrown at the moment
        await agent
            .put(`offers/${savedOffer.id}`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            })
            .expect(({body}) => {
                body.offers[0].tier.id.should.eql(defaultTier.id);
            });
    });
});