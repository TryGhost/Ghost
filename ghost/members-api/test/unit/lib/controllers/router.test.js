const sinon = require('sinon');
const RouterController = require('../../../../lib/controllers/RouterController');

describe('RouterController', function () {
    describe('createCheckoutSession', function (){
        let offersAPI;
        let paymentsService;
        let tiersService;
        let stripeAPIService;
        let labsService;
        let getPaymentLinkSpy;

        beforeEach(async function () {
            getPaymentLinkSpy = sinon.spy();

            tiersService = {
                api: {
                    read: sinon.stub().resolves({
                        id: 'tier_123'
                    })
                }
            };

            paymentsService = {
                getPaymentLink: getPaymentLinkSpy
            };

            offersAPI = {
                getOffer: sinon.stub().resolves({
                    id: 'offer_123',
                    tier: {
                        id: 'tier_123'
                    }
                }),
                findOne: sinon.stub().resolves({
                    related: () => {
                        return {
                            query: sinon.stub().returns({
                                fetchOne: sinon.stub().resolves({})
                            }),
                            toJSON: sinon.stub().returns([]),
                            fetch: sinon.stub().resolves({
                                toJSON: sinon.stub().returns({})
                            })
                        };
                    },
                    toJSON: sinon.stub().returns({})
                }),
                edit: sinon.stub().resolves({
                    attributes: {},
                    _previousAttributes: {}
                })
            };

            stripeAPIService = {
                configured: true
            };
            labsService = {
                isSet: sinon.stub().returns(true)
            };
        });

        it('passes offer metadata to payment link method', async function (){
            const routerController = new RouterController({
                tiersService,
                paymentsService,
                offersAPI,
                stripeAPIService,
                labsService
            });

            await routerController.createCheckoutSession({
                body: {
                    offerId: 'offer_123'
                }
            }, {
                writeHead: () => {},
                end: () => {}
            });

            getPaymentLinkSpy.calledOnce.should.be.true();

            // Payment link is called with the offer id in metadata
            getPaymentLinkSpy.calledWith(sinon.match({
                metadata: {offer: 'offer_123'}
            })).should.be.true();
        });

        afterEach(function () {
            sinon.restore();
        });
    });
});
