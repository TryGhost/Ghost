const sinon = require('sinon');
const MemberController = require('../../../../../lib/controllers/MemberController');

describe('MemberController', function () {
    describe('updateSubscription', function () {
        it('Updates a subscriptions plan via the member repository if the Tier is active', async function () {
            const tokenService = {
                decodeToken: sinon.fake.resolves({sub: 'fake@email.com'})
            };
            const StripePrice = {
                findOne: sinon.fake.returns({
                    id: 'plan_id',
                    stripe_price_id: 'stripe_price_id',
                    get: () => {
                        return 'stripe_price_id';
                    }
                })
            };

            const memberRepository = {
                updateSubscription: sinon.mock('updateSubscription').once().withArgs({
                    email: 'fake@email.com',
                    subscription: {
                        subscription_id: 'subscription_id',
                        price: 'stripe_price_id'
                    }
                })
            };

            const tier = {
                id: 'whatever'
            };

            const price = {
                id: 'stripe_price_id'
            };

            const tiersService = {
                api: {
                    read: sinon.fake.resolves(tier)
                }
            };

            const paymentsService = {
                getPriceForTierCadence: sinon.fake.resolves(price)
            };

            const productRepository = {
                get: sinon.fake.resolves({
                    get() {
                        return true;
                    }
                })
            };

            const controller = new MemberController({
                memberRepository,
                productRepository,
                tiersService,
                paymentsService,
                StripePrice,
                tokenService
            });

            const req = {
                body: {
                    identity: 'token',
                    tierId: 'tier_id',
                    cadence: 'yearly'
                },
                params: {
                    id: 'subscription_id'
                }
            };
            const res = {
                writeHead() {},
                end() {}
            };

            await controller.updateSubscription(req, res);

            memberRepository.updateSubscription.verify();
        });

        it('Does not a subscriptions plan via the member repository if the Tier is not active', async function () {
            const tokenService = {
                decodeToken: sinon.fake.resolves({sub: 'fake@email.com'})
            };
            const StripePrice = {
                findOne: sinon.fake.returns({
                    id: 'plan_id',
                    stripe_price_id: 'stripe_price_id',
                    get: () => {
                        return 'stripe_price_id';
                    }
                })
            };

            const memberRepository = {
                updateSubscription: sinon.mock('updateSubscription').never()
            };

            const productRepository = {
                get: sinon.fake.resolves({
                    get() {
                        return false;
                    }
                })
            };

            const controller = new MemberController({
                memberRepository,
                productRepository,
                StripePrice,
                tokenService
            });

            const req = {
                body: {
                    identity: 'token',
                    priceId: 'plan_name'
                },
                params: {
                    id: 'subscription_id'
                }
            };
            const res = {
                writeHead() {},
                end() {}
            };

            await controller.updateSubscription(req, res);

            memberRepository.updateSubscription.verify();
        });

        it('Updates a subscriptions cancel_at_period_end via the member repository', async function () {
            const tokenService = {
                decodeToken: sinon.fake.resolves({sub: 'fake@email.com'})
            };
            const stripePlansService = {
                getPlan: sinon.fake.returns({id: 'plan_id'})
            };

            const memberRepository = {
                updateSubscription: sinon.mock('updateSubscription').once().withArgs({
                    email: 'fake@email.com',
                    subscription: {
                        subscription_id: 'subscription_id',
                        cancellationReason: 'For reasonable reasons',
                        cancel_at_period_end: true
                    }
                })
            };

            const controller = new MemberController({
                memberRepository,
                stripePlansService,
                tokenService
            });

            const req = {
                body: {
                    identity: 'token',
                    cancel_at_period_end: true,
                    cancellation_reason: 'For reasonable reasons'
                },
                params: {
                    id: 'subscription_id'
                }
            };
            const res = {
                writeHead() {},
                end() {}
            };

            await controller.updateSubscription(req, res);

            memberRepository.updateSubscription.verify();
        });

        describe('smart_cancel', function () {
            it('Updates a paid subscriptions cancel_at_period_end via the member repository', async function () {
                const tokenService = {
                    decodeToken: sinon.fake.resolves({sub: 'fake@email.com'})
                };
                const stripePlansService = {
                    getPlan: sinon.fake.returns({id: 'plan_id'})
                };

                const memberRepository = {
                    updateSubscription: sinon.mock('updateSubscription').once().withArgs({
                        email: 'fake@email.com',
                        subscription: {
                            subscription_id: 'subscription_id',
                            cancellationReason: 'For reasonable reasons',
                            cancel_at_period_end: true
                        }
                    }),
                    getSubscription: sinon.fake.resolves({
                        status: 'active'
                    })
                };

                const controller = new MemberController({
                    memberRepository,
                    stripePlansService,
                    tokenService
                });

                const req = {
                    body: {
                        identity: 'token',
                        smart_cancel: true,
                        cancellation_reason: 'For reasonable reasons'
                    },
                    params: {
                        id: 'subscription_id'
                    }
                };
                const res = {
                    writeHead() {},
                    end() {}
                };

                await controller.updateSubscription(req, res);

                memberRepository.updateSubscription.verify();
            });

            it('Cancels an unpaid subscription via the member repository', async function () {
                const tokenService = {
                    decodeToken: sinon.fake.resolves({sub: 'fake@email.com'})
                };
                const stripePlansService = {
                    getPlan: sinon.fake.returns({id: 'plan_id'})
                };

                const memberRepository = {
                    updateSubscription: sinon.fake(),
                    cancelSubscription: sinon.mock('cancelSubscription').once().withArgs({
                        email: 'fake@email.com',
                        subscription: {
                            subscription_id: 'subscription_id',
                            cancellationReason: 'For reasonable reasons'
                        }
                    }),
                    getSubscription: sinon.fake.resolves({
                        status: 'unpaid'
                    })
                };

                const controller = new MemberController({
                    memberRepository,
                    stripePlansService,
                    tokenService
                });

                const req = {
                    body: {
                        identity: 'token',
                        smart_cancel: true,
                        cancellation_reason: 'For reasonable reasons'
                    },
                    params: {
                        id: 'subscription_id'
                    }
                };
                const res = {
                    writeHead() {},
                    end() {}
                };

                await controller.updateSubscription(req, res);

                memberRepository.cancelSubscription.verify();
            });
        });
    });
});
