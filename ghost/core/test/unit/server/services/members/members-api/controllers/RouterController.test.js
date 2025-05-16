require('should');
const sinon = require('sinon');
const assert = require('assert').strict;
const errors = require('@tryghost/errors');

// @ts-ignore - Intentionally ignoring TypeScript errors for tests
const RouterController = require('../../../../../../../core/server/services/members/members-api/controllers/RouterController');

describe('RouterController', function () {
    let offersAPI;
    let paymentsService;
    let tiersService;
    let stripeAPIService;
    let labsService;
    let getPaymentLinkSpy;
    let getDonationLinkSpy;
    let settingsCache;

    beforeEach(async function () {
        getPaymentLinkSpy = sinon.spy();
        getDonationLinkSpy = sinon.spy();
        tiersService = {
            api: {
                read: sinon.stub().resolves({
                    id: 'tier_123'
                })
            }
        };

        paymentsService = {
            getPaymentLink: getPaymentLinkSpy,
            stripeAPIService: {
                configured: true
            },
            getDonationPaymentLink: getDonationLinkSpy
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
        settingsCache = {
            get: sinon.stub().withArgs('all_blocked_email_domains').returns(['spam.xyz'])
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('createCheckoutSession', function (){
        it('passes offer metadata to payment link method', async function (){
            const routerController = new RouterController({
                tiersService,
                paymentsService,
                offersAPI,
                stripeAPIService,
                labsService,
                settingsCache
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

        it('parses newsletters from the request body', async function () {
            const newslettersServiceStub = {
                getAll: sinon.stub()
            };
            newslettersServiceStub.getAll.resolves([
                {id: 'abc123', name: 'Newsletter 1', status: 'active'},
                {id: 'def456', name: 'Newsletter 2', status: 'active'}
            ]);
            const routerController = new RouterController({
                tiersService,
                paymentsService,
                offersAPI,
                stripeAPIService,
                labsService,
                settingsCache,
                newslettersService: newslettersServiceStub
            });
            const newsletters = [
                {id: 'abc123', name: 'Newsletter 1'},
                {id: 'def456', name: 'Newsletter 2'}
            ];
            const newslettersString = JSON.stringify(newsletters);
            const req = {
                body: {
                    tierId: 'tier_123',
                    cadence: 'month',
                    metadata: {
                        newsletters: newslettersString
                    }
                }
            };

            await routerController.createCheckoutSession(req, {
                writeHead: () => {},
                end: () => {}
            });

            const expectedNewsletters = JSON.stringify([{id: 'abc123'}, {id: 'def456'}]);

            getPaymentLinkSpy.calledOnce.should.be.true();

            getPaymentLinkSpy.calledWith(sinon.match({
                metadata: {
                    newsletters: expectedNewsletters
                }
            })).should.be.true();
        });

        describe('_getSubscriptionCheckoutData', function () {
            it('returns a BadRequestError if both offerId and tierId are missing', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache
                });

                try {
                    await routerController._getSubscriptionCheckoutData({body: {}});
                    assert.fail('Expected function to throw BadRequestError');
                } catch (error) {
                    assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                    assert.equal(error.context, 'Expected offerId or tierId, received none');
                }
            });

            it('returns a BadRequestError if both offerId and tierId are provided', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache
                });

                try {
                    await routerController._getSubscriptionCheckoutData({tierId: 'tier_123', offerId: 'offer_123'});
                    assert.fail('Expected function to throw BadRequestError');
                } catch (error) {
                    assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                    assert.equal(error.context, 'Expected offerId or tierId, received both');
                }
            });

            it('returns a BadRequestError if tierId is provided wihout a cadence', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache
                });

                try {
                    await routerController._getSubscriptionCheckoutData({tierId: 'tier_123'});
                    assert.fail('Expected function to throw BadRequestError');
                } catch (error) {
                    assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                    assert.equal(error.context, 'Expected cadence to be "month" or "year", received undefined');
                }
            });

            it('returns a BadRequestError if tierId is provided wihout a valid cadence', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache
                });

                try {
                    await routerController._getSubscriptionCheckoutData({tierId: 'tier_123', cadence: 'day'});
                    assert.fail('Expected function to throw BadRequestError');
                } catch (error) {
                    assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                    assert.equal(error.context, 'Expected cadence to be "month" or "year", received "day"');
                }
            });

            it('returns a BadRequestError if offer is not found by offerId', async function () {
                offersAPI = {
                    getOffer: sinon.stub().resolves(null)
                };

                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache
                });

                try {
                    await routerController._getSubscriptionCheckoutData({offerId: 'invalid'});

                    assert.fail('Expected function to throw BadRequestError');
                } catch (error) {
                    assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                    assert.equal(error.context, 'Offer with id "invalid" not found');
                }
            });

            it('returns a BadRequestError if tier is not found by tierId', async function () {
                tiersService = {
                    api: {
                        read: sinon.stub().resolves(null)
                    }
                };

                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache
                });

                try {
                    await routerController._getSubscriptionCheckoutData({tierId: 'invalid', cadence: 'year'});

                    assert.fail('Expected function to throw BadRequestError');
                } catch (error) {
                    assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                    assert.equal(error.context, 'Tier with id "invalid" not found');
                }
            });

            it('returns a BadRequestError if fetching tier by tierId throws', async function () {
                tiersService = {
                    api: {
                        read: sinon.stub().rejects(new Error('Fail to fetch tier'))
                    }
                };

                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache
                });

                try {
                    await routerController._getSubscriptionCheckoutData({tierId: 'invalid', cadence: 'year'});

                    assert.fail('Expected function to throw BadRequestError');
                } catch (error) {
                    assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                    assert.equal(error.context, 'Tier with id "invalid" not found');
                }
            });
        });
        describe('_createDonationCheckoutSession', function () {
            it('accepts requests with a personalNote included', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache,
                    memberAttributionService: {
                        getAttribution: sinon.stub().resolves({})
                    }
                });

                await routerController.createCheckoutSession({
                    body: {
                        type: 'donation',
                        successUrl: 'https://example.com/?type=success',
                        cancelUrl: 'https://example.com/?type=cancel',
                        personalNote: 'SVP leave a note here',
                        metadata: {
                            test: 'hello',
                            urlHistory: [
                                {
                                    path: 'https://example.com/',
                                    time: Date.now(),
                                    referrerMedium: null,
                                    referrerSource: 'ghost-explore',
                                    referrerUrl: 'https://example.com/blog/'
                                }
                            ]
                        }
                    }
                }, {
                    writeHead: () => {},
                    end: () => {}
                });
                getDonationLinkSpy.calledOnce.should.be.true();

                getDonationLinkSpy.calledWith(sinon.match({
                    successUrl: 'https://example.com/?type=success',
                    cancelUrl: 'https://example.com/?type=cancel',
                    personalNote: 'SVP leave a note here',
                    metadata: {
                        test: 'hello'
                    }
                })).should.be.true();
            });
            it('accepts requests without a personalNote included', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache,
                    memberAttributionService: {
                        getAttribution: sinon.stub().resolves({})
                    }
                });

                await routerController.createCheckoutSession({
                    body: {
                        type: 'donation',
                        successUrl: 'https://example.com/?type=success',
                        cancelUrl: 'https://example.com/?type=cancel',
                        metadata: {
                            test: 'hello',
                            urlHistory: [
                                {
                                    path: 'https://example.com/',
                                    time: Date.now(),
                                    referrerMedium: null,
                                    referrerSource: 'ghost-explore',
                                    referrerUrl: 'https://example.com/blog/'
                                }
                            ]
                        }
                    }
                }, {
                    writeHead: () => {},
                    end: () => {}
                });
                getDonationLinkSpy.calledOnce.should.be.true();

                getDonationLinkSpy.calledWith(sinon.match({
                    successUrl: 'https://example.com/?type=success',
                    cancelUrl: 'https://example.com/?type=cancel',
                    personalNote: '',
                    metadata: {
                        test: 'hello'
                    }
                })).should.be.true();
            });
            it('silently discards too-long personal notes', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache,
                    memberAttributionService: {
                        getAttribution: sinon.stub().resolves({})
                    }
                });

                await routerController.createCheckoutSession({
                    body: {
                        type: 'donation',
                        successUrl: 'https://example.com/?type=success',
                        cancelUrl: 'https://example.com/?type=cancel',
                        personalNote: 'a'.repeat(1000),
                        metadata: {
                            test: 'hello',
                            urlHistory: [
                                {
                                    path: 'https://example.com/',
                                    time: Date.now(),
                                    referrerMedium: null,
                                    referrerSource: 'ghost-explore',
                                    referrerUrl: 'https://example.com/blog/'
                                }
                            ]
                        }
                    }
                }, {
                    writeHead: () => {},
                    end: () => {}
                });
                getDonationLinkSpy.calledOnce.should.be.true();
                getDonationLinkSpy.calledWith(sinon.match({
                    successUrl: 'https://example.com/?type=success',
                    cancelUrl: 'https://example.com/?type=cancel',
                    personalNote: '',
                    metadata: {
                        test: 'hello'
                    }
                })).should.be.true();
            });
            it('silently discards invalid personal notes', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache,
                    memberAttributionService: {
                        getAttribution: sinon.stub().resolves({})
                    }
                });

                await routerController.createCheckoutSession({
                    body: {
                        type: 'donation',
                        successUrl: 'https://example.com/?type=success',
                        cancelUrl: 'https://example.com/?type=cancel',
                        personalNote: {hey: 'look! an object!'},
                        metadata: {
                            test: 'hello',
                            urlHistory: [
                                {
                                    path: 'https://example.com/',
                                    time: Date.now(),
                                    referrerMedium: null,
                                    referrerSource: 'ghost-explore',
                                    referrerUrl: 'https://example.com/blog/'
                                }
                            ]
                        }
                    }
                }, {
                    writeHead: () => {},
                    end: () => {}
                });
                getDonationLinkSpy.calledOnce.should.be.true();
                getDonationLinkSpy.calledWith(sinon.match({
                    successUrl: 'https://example.com/?type=success',
                    cancelUrl: 'https://example.com/?type=cancel',
                    personalNote: '',
                    metadata: {
                        test: 'hello'
                    }
                })).should.be.true();
            });
            it('strips any html from the personal note', async function () {
                const routerController = new RouterController({
                    tiersService,
                    paymentsService,
                    offersAPI,
                    stripeAPIService,
                    labsService,
                    settingsCache,
                    memberAttributionService: {
                        getAttribution: sinon.stub().resolves({})
                    }
                });

                await routerController.createCheckoutSession({
                    body: {
                        type: 'donation',
                        successUrl: 'https://example.com/?type=success',
                        cancelUrl: 'https://example.com/?type=cancel',
                        personalNote: 'Leave a <a href="ghost.org">note</a> here',
                        metadata: {
                            test: 'hello',
                            urlHistory: [
                                {
                                    path: 'https://example.com/',
                                    time: Date.now(),
                                    referrerMedium: null,
                                    referrerSource: 'ghost-explore',
                                    referrerUrl: 'https://example.com/blog/'
                                }
                            ]
                        }
                    }
                }, {
                    writeHead: () => {},
                    end: () => {}
                });
                getDonationLinkSpy.calledOnce.should.be.true();
                getDonationLinkSpy.calledWith(sinon.match({
                    successUrl: 'https://example.com/?type=success',
                    cancelUrl: 'https://example.com/?type=cancel',
                    personalNote: 'Leave a note here',
                    metadata: {
                        test: 'hello'
                    }
                })).should.be.true();
            });
        });

        it('adds welcomePageUrl to response for authenticated members when tier has welcomePageURL', async function () {
            const routerController = new RouterController({
                tiersService: {
                    api: {
                        read: sinon.stub().resolves({
                            id: 'tier_123',
                            welcomePageURL: '/welcome-page/'
                        })
                    }
                },
                paymentsService: {
                    getPaymentLink: sinon.stub().resolves('https://example.com/checkout/')
                },
                tokenService: {
                    decodeToken: sinon.stub().resolves({sub: 'test@example.com'})
                },
                memberRepository: {
                    get: sinon.stub().resolves({
                        email: 'test@example.com',
                        get: sinon.stub().returns('free'),
                        related: sinon.stub().returns({
                            query: sinon.stub().returns({
                                fetch: sinon.stub().resolves([])
                            })
                        })
                    })
                },
                urlUtils: {
                    getSiteUrl: sinon.stub().returns('https://example.com/')
                },
                memberAttributionService: {
                    getAttribution: sinon.stub().resolves({})
                }
            });

            const req = {
                body: {
                    tierId: 'tier_123',
                    cadence: 'month',
                    successUrl: 'https://example.com/success',
                    cancelUrl: 'https://example.com/cancel',
                    identity: 'identity-token',
                    metadata: {}
                }
            };

            const res = {
                writeHead: sinon.stub(),
                end: sinon.stub()
            };

            await routerController.createCheckoutSession(req, res);

            res.end.calledOnce.should.be.true();
            const responseBody = JSON.parse(res.end.firstCall.args[0]);
            assert.equal(responseBody.welcomePageUrl, '/welcome-page/');
        });

        it('does not add welcomePageUrl to response when tier has no welcomePageURL', async function () {
            const routerController = new RouterController({
                tiersService: {
                    api: {
                        read: sinon.stub().resolves({
                            id: 'tier_123'
                            // No welcomePageURL
                        })
                    }
                },
                paymentsService: {
                    getPaymentLink: sinon.stub().resolves('https://example.com/checkout/')
                },
                tokenService: {
                    decodeToken: sinon.stub().resolves({sub: 'test@example.com'})
                },
                memberRepository: {
                    get: sinon.stub().resolves({
                        email: 'test@example.com',
                        get: sinon.stub().returns('free'),
                        related: sinon.stub().returns({
                            query: sinon.stub().returns({
                                fetch: sinon.stub().resolves([])
                            })
                        })
                    })
                },
                urlUtils: {
                    getSiteUrl: sinon.stub().returns('https://example.com/')
                },
                memberAttributionService: {
                    getAttribution: sinon.stub().resolves({})
                }
            });

            const req = {
                body: {
                    tierId: 'tier_123',
                    cadence: 'month',
                    successUrl: 'https://example.com/success',
                    cancelUrl: 'https://example.com/cancel',
                    identity: 'identity-token',
                    metadata: {}
                }
            };

            const res = {
                writeHead: sinon.stub(),
                end: sinon.stub()
            };

            await routerController.createCheckoutSession(req, res);

            res.end.calledOnce.should.be.true();
            const responseBody = JSON.parse(res.end.firstCall.args[0]);
            assert.equal(responseBody.welcomePageUrl, undefined);
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
                    settingsCache,
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
                    getAll: sinon.stub()
                };

                newslettersServiceStub.getAll
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
                    getAll: sinon.stub()
                };

                newslettersServiceStub.getAll
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
                    getAll: sinon.stub()
                };

                newslettersServiceStub.getAll
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

        describe('honeypot', function () {
            let req, res, sendEmailWithMagicLinkStub;

            const createRouterController = (deps = {}) => {
                return new RouterController({
                    allowSelfSignup: sinon.stub().returns(true),
                    memberAttributionService: {
                        getAttribution: sinon.stub().resolves({})
                    },
                    sendEmailWithMagicLink: sendEmailWithMagicLinkStub,
                    settingsCache,
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

            it('Sends emails when honeypot is not filled', async function () {
                const controller = createRouterController();

                await controller.sendMagicLink(req, res).should.be.fulfilled();
                sendEmailWithMagicLinkStub.calledOnce.should.be.true();
            });

            it('Does not send emails when honeypot is filled', async function () {
                const controller = createRouterController();

                req.body.honeypot = 'filled!';

                await controller.sendMagicLink(req, res).should.be.fulfilled();
                sendEmailWithMagicLinkStub.notCalled.should.be.true();
            });
        });
    });

    describe('_generateSuccessUrl', function () {
        let urlUtilsStub;

        beforeEach(function () {
            urlUtilsStub = {
                getSiteUrl: sinon.stub().returns('https://example.com/')
            };
        });

        it('returns original success URL when welcomePageURL is not set', function () {
            const routerController = new RouterController({
                urlUtils: urlUtilsStub
            });

            const originalUrl = 'https://example.com/success';
            const result = routerController._generateSuccessUrl(originalUrl, null);

            assert.equal(result, originalUrl);
        });

        it('returns welcome page URL with success parameters when welcomePageURL is set', function () {
            const routerController = new RouterController({
                urlUtils: urlUtilsStub
            });

            const originalUrl = 'https://example.com/success';
            const welcomePageURL = '/welcome-paid-members/';
            const result = routerController._generateSuccessUrl(originalUrl, welcomePageURL);

            assert.equal(result, 'https://example.com/welcome-paid-members/?success=true&action=signup');
        });

        it('handles absolute URLs in welcomePageURL', function () {
            const routerController = new RouterController({
                urlUtils: urlUtilsStub
            });

            const originalUrl = 'https://example.com/success';
            const welcomePageURL = 'https://external-site.com/welcome';
            const result = routerController._generateSuccessUrl(originalUrl, welcomePageURL);

            assert.equal(result, 'https://external-site.com/welcome?success=true&action=signup');
        });

        it('returns original URL if welcomePageURL is invalid', function () {
            const routerController = new RouterController({
                urlUtils: urlUtilsStub
            });

            const originalUrl = 'https://example.com/success';
            // Using a URL that would throw an error when trying to create a URL object
            const welcomePageURL = 'http://invalid-url:-with-bad-port';
            const result = routerController._generateSuccessUrl(originalUrl, welcomePageURL);

            assert.equal(result, originalUrl);
        });
    });

    describe('_validateNewsletters', function () {
        let newslettersServiceStub;
        let routerController;
        beforeEach(function () {
            newslettersServiceStub = {
                getAll: sinon.stub()
            };
            newslettersServiceStub.getAll.resolves([
                {id: 'abc123', name: 'Newsletter 1', status: 'active'},
                {id: 'def456', name: 'Newsletter 2', status: 'active'},
                {id: 'ghi789', name: 'Newsletter 3', status: 'active'}
            ]);
            routerController = new RouterController({
                tiersService,
                paymentsService,
                offersAPI,
                stripeAPIService,
                labsService,
                settingsCache,
                newslettersService: newslettersServiceStub
            });
        });

        it('validates newsletters', async function () {
            const requestedNewsletters = [
                {name: 'Newsletter 1'},
                {name: 'Newsletter 2'},
                {name: 'Newsletter 3'}
            ];
            const result = await routerController._validateNewsletters(requestedNewsletters);
            result.should.eql([
                {id: 'abc123'},
                {id: 'def456'},
                {id: 'ghi789'}
            ]);
        });

        it('returns undefined if newsletters is an empty array', async function () {
            const requestedNewsletters = [];
            const result = await routerController._validateNewsletters(requestedNewsletters);
            assert.equal(result, undefined);
        });

        it('returns undefined if newsletters is undefined', async function () {
            const requestedNewsletters = undefined;
            const result = await routerController._validateNewsletters(requestedNewsletters);
            assert.equal(result, undefined);
        });

        it('returns undefined if any newsletter is missing a name', async function () {
            const requestedNewsletters = [
                {name: 'Newsletter 1'},
                {id: 'def456'}
            ];
            const result = await routerController._validateNewsletters(requestedNewsletters);
            assert.equal(result, undefined);
        });

        it('throws an error if an invalid newsletter is provided', async function () {
            const requestedNewsletters = [
                {name: 'Newsletter 1'},
                {name: 'Newsletter 2'},
                {name: 'Newsletter 3'},
                {name: 'fake newsletter'}
            ];
            try {
                await routerController._validateNewsletters(requestedNewsletters);
                assert.fail('Expected function to throw BadRequestError');
            } catch (error) {
                assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                assert.equal(error.message, 'Cannot subscribe to invalid newsletters fake newsletter');
            }
        });

        it('throws an error if an archived newsletter is provided', async function () {
            newslettersServiceStub.getAll.resolves([
                {id: 'abc123', name: 'Newsletter 1', status: 'active'},
                {id: 'def456', name: 'Newsletter 2', status: 'archived'},
                {id: 'ghi789', name: 'Newsletter 3', status: 'active'}
            ]);

            const requestedNewsletters = [
                {name: 'Newsletter 1'},
                {name: 'Newsletter 2'},
                {name: 'Newsletter 3'}
            ];

            try {
                await routerController._validateNewsletters(requestedNewsletters);
                assert.fail('Expected function to throw BadRequestError');
            } catch (error) {
                assert(error instanceof errors.BadRequestError, 'Error should be an instance of BadRequestError');
                assert.equal(error.message, 'Cannot subscribe to archived newsletters Newsletter 2');
            }
        });
    });
});
