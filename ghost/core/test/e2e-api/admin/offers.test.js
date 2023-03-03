const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyLocationFor, anyErrorId} = matchers;
const should = require('should');
const models = require('../../../core/server/models');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

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
    let trialOffer;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
        defaultTier = await getPaidProduct();
    });

    this.afterEach(function () {
        sinon.restore();
    });

    it('Has no initial offers', async function () {
        await agent
            .get(`offers/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot();
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
                'content-version': anyContentVersion,
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

    it('Can add a new offer with minimal fields', async function () {
        const newOffer = {
            name: 'Easter Sales',
            code: 'easter',
            cadence: 'month',
            amount: 50,
            duration: 'once',
            type: 'percent',
            tier: {
                id: defaultTier.id
            }
        };

        await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
    });

    it('Slugifies offer codes', async function () {
        const newOffer = {
            name: 'Summer Sale',
            code: 'Summer sale',
            cadence: 'year',
            amount: 20,
            duration: 'once',
            type: 'percent',
            tier: {
                id: defaultTier.id
            }
        };

        await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
            })
            .expect(({body}) => {
                body.offers[0].code.should.eql('summer-sale');
            });
    });

    it('Can add a fixed offer', async function () {
        const newOffer = {
            name: 'Fourth of July Sales',
            code: '4th',
            cadence: 'year',
            amount: 100,
            duration: 'once',
            type: 'fixed',
            currency: 'USD',
            tier: {
                id: defaultTier.id
            }
        };

        await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
    });

    it('Can add a trial offer', async function () {
        const newOffer = {
            name: 'Fourth of July Sales trial',
            code: '4th-trial',
            cadence: 'year',
            amount: 20,
            duration: 'trial',
            type: 'trial',
            currency: 'USD',
            tier: {
                id: defaultTier.id
            }
        };

        const {body} = await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
        trialOffer = body.offers[0];
    });

    it('Cannot create offer with same code', async function () {
        sinon.stub(logging, 'error');

        const newOffer = {
            name: 'Fourth of July',
            code: '4th',
            cadence: 'year',
            amount: 200,
            duration: 'once',
            type: 'fixed',
            currency: 'USD',
            tier: {
                id: defaultTier.id
            }
        };

        await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(400)
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

    it('Cannot create offer with same slugified code', async function () {
        sinon.stub(logging, 'error');

        const newOffer = {
            name: 'Another Black Friday Sale',
            code: 'black friday',
            cadence: 'year',
            amount: 200,
            duration: 'once',
            type: 'fixed',
            currency: 'USD',
            tier: {
                id: defaultTier.id
            }
        };

        await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(400)
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

    it('Cannot create offer with same name', async function () {
        sinon.stub(logging, 'error');

        const newOffer = {
            name: 'Fourth of July Sales',
            code: 'july4',
            cadence: 'year',
            amount: 150,
            duration: 'once',
            type: 'fixed',
            currency: 'USD',
            tier: {
                id: defaultTier.id
            }
        };

        await agent
            .post(`offers/`)
            .body({offers: [newOffer]})
            .expectStatus(400)
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

    it('Can browse', async function () {
        await agent
            .get(`offers/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(5).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            });
    });

    it('Can get a single offer', async function () {
        await agent
            .get(`offers/${savedOffer.id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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

    it('Can get a trial offer', async function () {
        await agent
            .get(`offers/${trialOffer.id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(1).fill({
                    id: anyObjectId,
                    type: 'trial',
                    duration: 'trial',
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
            code: 'cyber monday',
            display_title: 'Cyber Monday Sale!',
            display_description: '10% off on yearly plan, only today'
        };

        await agent
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
                // Test if all the changes were applied, and that the code has been slugified
                body.offers[0].should.match({...updatedOffer, code: 'cyber-monday'});
            });
    });

    it('Cannot update offer code to one that exists', async function () {
        sinon.stub(logging, 'error');

        // We can change all fields except discount related fields
        let updatedOffer = {
            code: '4th'
        };

        await agent
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(400)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: new Array(1).fill({
                    id: anyErrorId
                })
            });
    });

    it('Cannot update offer code to one that exists after it is slugified', async function () {
        sinon.stub(logging, 'error');

        // We can change all fields except discount related fields
        let updatedOffer = {
            code: 'Summer sale'
        };

        await agent
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(400)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: new Array(1).fill({
                    id: anyErrorId
                })
            });
    });

    it('Cannot update offer name to one that exists', async function () {
        sinon.stub(logging, 'error');

        // We can change all fields except discount related fields
        let updatedOffer = {
            name: 'Easter Sales'
        };

        await agent
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(400)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: new Array(1).fill({
                    id: anyErrorId
                })
            });
    });

    it('Can archive an offer', async function () {
        // We can change all fields except discount related fields
        let updatedOffer = {
            status: 'archived'
        };

        await agent
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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

    it('Can browse archived', async function () {
        const filter = encodeURIComponent(`status:archived`);
        await agent
            .get(`offers/?filter=${filter}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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

    it('Can browse active', async function () {
        const filter = encodeURIComponent(`status:active`);
        await agent
            .get(`offers/?filter=${filter}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                offers: new Array(4).fill({
                    id: anyObjectId,
                    tier: {
                        id: anyObjectId
                    }
                })
            });
    });

    it('Cannot update offer cadence', async function () {
        // We can change all fields except discount related fields
        let updatedOffer = {
            cadence: 'month'
        };

        await agent
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
            .put(`offers/${savedOffer.id}/`)
            .body({offers: [updatedOffer]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
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
