const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const StripeAPI = rewire('../../../lib/StripeAPI');

describe('StripeAPI', function () {
    const mockCustomerEmail = 'foo@example.com';
    const mockCustomerId = 'cust_mock_123456';
    const mockCustomerName = 'Example Customer';
    let mockLabs = {
        isSet() {
            return false;
        }
    };
    const api = new StripeAPI({labs: mockLabs});

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
            sinon.stub(mockLabs, 'isSet');
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

        it('Sends card as payment method if labs flag not enabled', async function () {
            await api.createCheckoutSession('priceId', null, {});

            should.deepEqual(mockStripe.checkout.sessions.create.firstCall.firstArg.payment_method_types, ['card']);
        });

        it('Sends no payment methods if labs flag is enabled', async function () {
            mockLabs.isSet.withArgs('additionalPaymentMethods').returns(true);
            await api.createCheckoutSession('priceId', null, {});

            should.deepEqual(mockStripe.checkout.sessions.create.firstCall.firstArg.payment_method_types, undefined);
        });

        it('sends success_url and cancel_url', async function () {
            await api.createCheckoutSession('priceId', null, {});

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

    describe('createCheckoutSetupSession', function () {
        beforeEach(function () {
            mockStripe = {
                checkout: {
                    sessions: {
                        create: sinon.stub().resolves()
                    }
                }
            };
            sinon.stub(mockLabs, 'isSet');
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

        it('createCheckoutSetupSession sends success_url and cancel_url', async function () {
            await api.createCheckoutSetupSession('priceId', {});

            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
            should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
        });

        it('createCheckoutSetupSession does not send currency if additionalPaymentMethods flag is off', async function () {
            mockLabs.isSet.withArgs('additionalPaymentMethods').returns(false);
            await api.createCheckoutSetupSession('priceId', {currency: 'usd'});

            should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.currency);
        });

        it('createCheckoutSetupSession sends currency if additionalPaymentMethods flag is on', async function () {
            mockLabs.isSet.withArgs('additionalPaymentMethods').returns(true);
            await api.createCheckoutSetupSession('priceId', {currency: 'usd'});

            should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.currency, 'usd');
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

    describe('cancelSubscriptionTrial', function () {
        const mockSubscription = {
            id: 'sub_123'
        };
        beforeEach(function () {
            mockStripe = {
                subscriptions: {
                    update: sinon.stub().resolves(mockSubscription)
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

        it('cancels a subscription trial', async function () {
            const result = await api.cancelSubscriptionTrial(mockSubscription.id);

            should.equal(mockStripe.subscriptions.update.callCount, 1);

            should.equal(mockStripe.subscriptions.update.args[0][0], mockSubscription.id);
            should.deepEqual(mockStripe.subscriptions.update.args[0][1], {trial_end: 'now'});

            should.deepEqual(result, mockSubscription);
        });

        describe('createCheckoutSetupSession automatic tax flag', function () {
            beforeEach(function () {
                mockStripe = {
                    checkout: {
                        sessions: {
                            create: sinon.stub().resolves()
                        }
                    },
                    customers: {
                        create: sinon.stub().resolves()
                    }
                };
                sinon.stub(mockLabs, 'isSet');
                mockLabs.isSet.withArgs('stripeAutomaticTax').returns(true);
                const mockStripeConstructor = sinon.stub().returns(mockStripe);
                StripeAPI.__set__('Stripe', mockStripeConstructor);
                api.configure({
                    checkoutSessionSuccessUrl: '/success',
                    checkoutSessionCancelUrl: '/cancel',
                    checkoutSetupSessionSuccessUrl: '/setup-success',
                    checkoutSetupSessionCancelUrl: '/setup-cancel',
                    secretKey: '',
                    enableAutomaticTax: true
                });
            });

            afterEach(function () {
                sinon.restore();
            });

            it('createCheckoutSession adds customer_update if automatic tax flag is enabled and customer is not undefined', async function () {
                const mockCustomer = {
                    id: mockCustomerId,
                    customer_email: mockCustomerEmail,
                    name: 'Example Customer'
                };

                await api.createCheckoutSession('priceId', mockCustomer, {
                    trialDays: null
                });
                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_update);
            });

            it('createCheckoutSession does not add customer_update if automatic tax flag is enabled and customer is undefined', async function () {
                await api.createCheckoutSession('priceId', undefined, {
                    trialDays: null
                });
                should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_update);
            });

            it('createCheckoutSession does not add customer_update if automatic tax flag is disabled', async function () {
                const mockCustomer = {
                    id: mockCustomerId,
                    customer_email: mockCustomerEmail,
                    name: 'Example Customer'
                };
                // set enableAutomaticTax: false
                api.configure({
                    checkoutSessionSuccessUrl: '/success',
                    checkoutSessionCancelUrl: '/cancel',
                    checkoutSetupSessionSuccessUrl: '/setup-success',
                    checkoutSetupSessionCancelUrl: '/setup-cancel',
                    secretKey: '',
                    enableAutomaticTax: false
                });
                await api.createCheckoutSession('priceId', mockCustomer, {
                    trialDays: null
                });
                should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_update);
            });
        });

        describe('createDonationCheckoutSession', function () {
            beforeEach(function () {
                mockStripe = {
                    checkout: {
                        sessions: {
                            create: sinon.stub().resolves()
                        }
                    }
                };
                sinon.stub(mockLabs, 'isSet');
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

            it('createDonationCheckoutSession sends success_url and cancel_url', async function () {
                await api.createDonationCheckoutSession('priceId', {});

                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
            });

            it('createDonationCheckoutSession does not send currency if additionalPaymentMethods flag is off', async function () {
                mockLabs.isSet.withArgs('additionalPaymentMethods').returns(false);
                await api.createDonationCheckoutSession('priceId', {currency: 'usd'});

                should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.currency);
            });

            it('passes customer ID when a valid customer object is provided', async function () {
                const mockCustomer = {
                    id: mockCustomerId,
                    email: mockCustomerEmail,
                    name: mockCustomerName
                };

                await api.createDonationCheckoutSession({
                    priceId: 'priceId',
                    successUrl: '/success',
                    cancelUrl: '/cancel',
                    metadata: {},
                    customer: mockCustomer
                });

                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
                should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, mockCustomerId);
            });

            it('passes customer_email when no customer object is provided', async function () {
                await api.createDonationCheckoutSession({
                    priceId: 'priceId',
                    successUrl: '/success',
                    cancelUrl: '/cancel',
                    metadata: {},
                    customerEmail: mockCustomerEmail
                });

                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
                should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, mockCustomerEmail);
            });

            it('uses only customer when both customer and customerEmail are provided', async function () {
                const mockCustomer = {
                    id: mockCustomerId,
                    email: mockCustomerEmail,
                    name: mockCustomerName
                };

                await api.createDonationCheckoutSession({
                    priceId: 'priceId',
                    successUrl: '/success',
                    cancelUrl: '/cancel',
                    metadata: {},
                    customer: mockCustomer,
                    customerEmail: 'another_email@example.com'
                });

                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
                should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, mockCustomerId);
                should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
            });

            it('passes metadata correctly', async function () {
                const metadata = {
                    ghost_donation: true
                };

                await api.createDonationCheckoutSession({
                    priceId: 'priceId',
                    successUrl: '/success',
                    cancelUrl: '/cancel',
                    metadata,
                    customer: null,
                    customerEmail: mockCustomerEmail
                });

                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.metadata);
                should.deepEqual(mockStripe.checkout.sessions.create.firstCall.firstArg.metadata, metadata);
            });

            it('passes custom fields correctly', async function () {
                await api.createDonationCheckoutSession({
                    priceId: 'priceId',
                    successUrl: '/success',
                    cancelUrl: '/cancel',
                    metadata: {},
                    customer: null,
                    customerEmail: mockCustomerEmail
                });

                should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.custom_fields);
                const customFields = mockStripe.checkout.sessions.create.firstCall.firstArg.custom_fields;
                should.equal(customFields.length, 1);
            });

            it('has correct data for custom field message', async function () {
                await api.createDonationCheckoutSession({
                    priceId: 'priceId',
                    successUrl: '/success',
                    cancelUrl: '/cancel',
                    metadata: {},
                    customer: null,
                    customerEmail: mockCustomerEmail
                });

                const customFields = mockStripe.checkout.sessions.create.firstCall.firstArg.custom_fields;
                should.deepEqual(customFields[0], {
                    key: 'donation_message',
                    label: {
                        type: 'custom',
                        custom: 'Add a personal note'
                    },
                    type: 'text',
                    optional: true
                });
            });

            it('does not have more than 3 custom fields (stripe limitation)', async function () {
                await api.createDonationCheckoutSession({
                    priceId: 'priceId',
                    successUrl: '/success',
                    cancelUrl: '/cancel',
                    metadata: {},
                    customer: null,
                    customerEmail: mockCustomerEmail
                });

                should.ok(mockStripe.checkout.sessions.create.firstCall.firstArg.custom_fields.length <= 3);
            });
        });
    });
});
