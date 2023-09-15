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

    describe('sendMagicLink', function () {
        describe('newsletters', function () {
            let req, res, sendEmailWithMagicLinkStub;

            const createRouterController = (deps = {}) => {
                return new RouterController({
                    allowSelfSignup: sinon.stub().returns(true),
                    memberAttributionService: {
                        getAttribution: sinon.stub().resolves({})
                    },
                    sendEmailWithMagicLink: sendEmailWithMagicLinkStub,
                    ...deps
                });
            };

            beforeEach(function () {
                req = {
                    body: {
                        email: 'jamie@example.com',
                        emailType: 'signup'
                    },
                    get: sinon.stub()
                };
                res = {
                    writeHead: sinon.stub(),

                    end: sinon.stub()
                };
                sendEmailWithMagicLinkStub = sinon.stub().resolves();
            });

            it('adds specified newsletters to the tokenData', async function () {
                const newsletters = [
                    {
                        id: 'abc123',
                        name: 'Newsletter 1',
                        status: 'active'
                    },
                    {
                        id: 'def456',
                        name: 'Newsletter 2',
                        status: 'active'
                    },
                    {
                        id: 'ghi789',
                        name: 'Newsletter 3',
                        status: 'active'
                    }
                ];

                req.body.newsletters = newsletters.map(newsletter => ({name: newsletter.name}));

                const newsletterNames = newsletters.map(newsletter => newsletter.name);
                const newsletterNamesFilter = newsletterNames.map(newsletter => `'${newsletter.replace(/("|')/g, '\\$1')}'`);
                const newslettersServiceStub = {
                    browse: sinon.stub()
                };

                newslettersServiceStub.browse
                    .withArgs({
                        filter: `name:[${newsletterNamesFilter}]`,
                        columns: ['id','name','status']
                    })
                    .resolves(newsletters);

                const controller = createRouterController({
                    newslettersService: newslettersServiceStub
                });

                await controller.sendMagicLink(req, res);

                res.writeHead.calledOnceWith(201).should.be.true();
                res.end.calledOnceWith('Created.').should.be.true();

                sendEmailWithMagicLinkStub.calledOnce.should.be.true();
                sendEmailWithMagicLinkStub.args[0][0].tokenData.newsletters.should.eql([
                    {id: newsletters[0].id},
                    {id: newsletters[1].id},
                    {id: newsletters[2].id}
                ]);
            });

            it('validates specified newsletters', async function () {
                const INVALID_NEWSLETTER_NAME = 'abc123';

                req.body.newsletters = [
                    {name: INVALID_NEWSLETTER_NAME}
                ];

                const newslettersServiceStub = {
                    browse: sinon.stub()
                };

                newslettersServiceStub.browse
                    .withArgs({
                        filter: `name:['${INVALID_NEWSLETTER_NAME}']`,
                        columns: ['id','name','status']
                    })
                    .resolves([]);

                const controller = createRouterController({
                    newslettersService: newslettersServiceStub
                });

                await controller.sendMagicLink(req, res).should.be.rejectedWith(`Cannot subscribe to invalid newsletters ${INVALID_NEWSLETTER_NAME}`);
            });

            it('validates archived newsletters', async function () {
                const newsletters = [
                    {
                        id: 'abc123',
                        name: 'Newsletter 1',
                        status: 'active'
                    },
                    {
                        id: 'def456',
                        name: 'Newsletter 2',
                        status: 'archived'
                    },
                    {
                        id: 'ghi789',
                        name: 'Newsletter 3',
                        status: 'active'
                    }
                ];

                req.body.newsletters = newsletters.map(newsletter => ({name: newsletter.name}));

                const newsletterNames = newsletters.map(newsletter => `'${newsletter.name}'`);
                const newslettersServiceStub = {
                    browse: sinon.stub()
                };

                newslettersServiceStub.browse
                    .withArgs({
                        filter: `name:[${newsletterNames}]`,
                        columns: ['id', 'name','status']
                    })
                    .resolves(newsletters);

                const controller = createRouterController({
                    newslettersService: newslettersServiceStub
                });

                await controller.sendMagicLink(req, res).should.be.rejectedWith(`Cannot subscribe to archived newsletters Newsletter 2`);
            });
        });
    });
});
