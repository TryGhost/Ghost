const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const StripeAPI = rewire('../../../lib/StripeAPI');
const api = new StripeAPI();

describe('StripeAPI', function () {
    const mockCustomerEmail = 'foo@example.com';
    const mockCustomerId = 'cust_mock_123456';
    const mockCustomerName = 'Example Customer';

    let mockStripe;

    describe('createCheckoutSession', function () {
        beforeEach(function () {
            mockStripe = {
                checkout: {
                    sessions: {
                        create: sinon.stub().resolves()
                    }
                }
            };
            const mockStripeConstructor = sinon.stub().returns(mockStripe);
            StripeAPI.__set__('Stripe', mockStripeConstructor);
            api.configure({
                checkoutSessionSuccessUrl: '/success',
                checkoutSessionCancelUrl: '/cancel',
                checkoutSetupSessionSuccessUrl: '/setup-success',
                checkoutSetupSessionCancelUrl: '/setup-cancel',
                secretKey: ''
            });
        });

        afterEach(function () {
            sinon.restore();
        });

        it('sends success_url and cancel_url', async function () {
            await api.createCheckoutSession('priceId', null, {});

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
        });

        it('createCheckoutSetupSession sends success_url and cancel_url', async function () {
            await api.createCheckoutSetupSession('priceId', {});

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
        });

        it('sets valid trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {
                trialDays: 12
            });

            should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days, 12);
        });

        it('uses trial_from_plan without trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {});

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
            should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
        });

        it('ignores 0 trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {
                trialDays: 0
            });

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
            should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
        });

        it('ignores null trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {
                trialDays: null
            });

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
            should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
        });

        it('passes customer ID successfully to Stripe', async function () {
            const mockCustomer = {
                id: mockCustomerId,
                customer_email: mockCustomerEmail,
                name: 'Example Customer'
            };

            await api.createCheckoutSession('priceId', mockCustomer, {
                trialDays: null
            });

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, 'cust_mock_123456');
        });

        it('passes email if no customer object provided', async function () {
            await api.createCheckoutSession('priceId', undefined, {
                customerEmail: mockCustomerEmail,
                trialDays: null
            });

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, 'foo@example.com');
        });

        it('passes email if customer object provided w/o ID', async function () {
            const mockCustomer = {
                email: mockCustomerEmail,
                name: mockCustomerName
            };

            await api.createCheckoutSession('priceId', mockCustomer, {
                trialDays: null
            });

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, 'foo@example.com');
        });

        it('passes only one of customer ID and email', async function () {
            const mockCustomer = {
                id: mockCustomerId,
                email: mockCustomerEmail,
                name: mockCustomerName
            };

            await api.createCheckoutSession('priceId', mockCustomer, {
                trialDays: null
            });

            should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, 'cust_mock_123456');
        });
    });

    describe('getCustomerIdByEmail', function () {
        describe('when no customer is found', function () {
            beforeEach(function () {
                mockStripe = {
                    customers: {
                        search: sinon.stub().resolves({
                            data: []
                        })
                    }
                };
                const mockStripeConstructor = sinon.stub().returns(mockStripe);
                StripeAPI.__set__('Stripe', mockStripeConstructor);
                api.configure({
                    secretKey: ''
                });
            });

            afterEach(function () {
                sinon.restore();
            });

            it('returns null if customer exists', async function () {
                const stripeCustomerId = await api.getCustomerIdByEmail(mockCustomerEmail);

                should.equal(stripeCustomerId, null);
            });
        });

        describe('when only one customer is found', function () {
            beforeEach(function () {
                mockStripe = {
                    customers: {
                        search: sinon.stub().resolves({
                            data: [{
                                id: mockCustomerId
                            }]
                        })
                    }
                };
                const mockStripeConstructor = sinon.stub().returns(mockStripe);
                StripeAPI.__set__('Stripe', mockStripeConstructor);
                api.configure({
                    secretKey: ''
                });
            });

            afterEach(function () {
                sinon.restore();
            });

            it('returns customer ID if customer exists', async function () {
                const stripeCustomerId = await api.getCustomerIdByEmail(mockCustomerEmail);

                should.equal(stripeCustomerId, mockCustomerId);
            });
        });

        describe('when multiple customers are found', function () {
            beforeEach(function () {
                mockStripe = {
                    customers: {
                        search: sinon.stub().resolves({
                            data: [{
                                id: 'recent_customer_id',
                                subscriptions: {
                                    data: [
                                        {current_period_end: 1000},
                                        {current_period_end: 9000}
                                    ]
                                }
                            },
                            {
                                id: 'customer_with_no_sub_id',
                                subscriptions: {
                                    data: []
                                }
                            },
                            {
                                id: 'old_customer_id',
                                subscriptions: {
                                    data: [
                                        {current_period_end: 5000}
                                    ]
                                }
                            }
                            ]
                        })
                    }
                };
                const mockStripeConstructor = sinon.stub().returns(mockStripe);
                StripeAPI.__set__('Stripe', mockStripeConstructor);
                api.configure({
                    secretKey: ''
                });
            });

            afterEach(function () {
                sinon.restore();
            });

            it('returns the customer with the most recent subscription', async function () {
                const stripeCustomerId = await api.getCustomerIdByEmail(mockCustomerEmail);

                should.equal(stripeCustomerId, 'recent_customer_id');
            });
        });
    });
});
