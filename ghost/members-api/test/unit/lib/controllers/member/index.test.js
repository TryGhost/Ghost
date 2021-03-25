const sinon = require('sinon');
const MemberController = require('../../../../../lib/controllers/member');

describe('MemberController', function () {
    describe('updateSubscription', function () {
        it('Updates a subscriptions plan via the member repository', async function () {
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
                        plan: 'plan_id'
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
                    planName: 'plan_name'
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
