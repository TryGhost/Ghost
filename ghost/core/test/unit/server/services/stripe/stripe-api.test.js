const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const rewire = require('rewire');
const StripeAPI = rewire('../../../../../core/server/services/stripe/stripe-api');

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
    let mockLabsIsSet;

    describe('createCheckoutSession', function () {
        beforeEach(function () {
            mockStripe = {
                checkout: {
                    sessions: {
                        create: sinon.stub().resolves()
                    }
                }
            };
            mockLabsIsSet = sinon.stub(mockLabs, 'isSet');
            const mockStripeConstructor = sinon.stub().returns(mockStripe);
            StripeAPI.__set__('Stripe', mockStripeConstructor);
            api.configure({
                checkoutSessionSuccessUrl: '/success',
                checkoutSessionCancelUrl: '/cancel',
                checkoutSetupSessionSuccessUrl: '/setup-success',
                checkoutSetupSessionCancelUrl: '/setup-cancel',
                billingPortalReturnUrl: '/billing-return',
                secretKey: ''
            });
        });

        afterEach(function () {
            sinon.restore();
        });

        it('Sends card as payment method if labs flag not enabled', async function () {
            await api.createCheckoutSession('priceId', null, {});

            assert.deepEqual(mockStripe.checkout.sessions.create.firstCall.firstArg.payment_method_types, ['card']);
        });

        it('Sends no payment methods if labs flag is enabled', async function () {
            mockLabsIsSet.withArgs('additionalPaymentMethods').returns(true);
            await api.createCheckoutSession('priceId', null, {});

            assert.deepEqual(mockStripe.checkout.sessions.create.firstCall.firstArg.payment_method_types, undefined);
        });

        it('sends success_url and cancel_url', async function () {
            await api.createCheckoutSession('priceId', null, {});

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
        });

        it('sets valid trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {
                trialDays: 12
            });

            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, undefined);
            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days, 12);
        });

        it('uses trial_from_plan without trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {});

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days, undefined);
        });

        it('ignores 0 trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {
                trialDays: 0
            });

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days, undefined);
        });

        it('ignores null trialDays', async function () {
            await api.createCheckoutSession('priceId', null, {
                trialDays: null
            });

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days, undefined);
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

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, 'cust_mock_123456');
        });

        it('passes email if no customer object provided', async function () {
            await api.createCheckoutSession('priceId', undefined, {
                customerEmail: mockCustomerEmail,
                trialDays: null
            });

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, 'foo@example.com');
        });

        it('passes email if customer object provided w/o ID', async function () {
            const mockCustomer = {
                email: mockCustomerEmail,
                name: mockCustomerName
            };

            await api.createCheckoutSession('priceId', mockCustomer, {
                trialDays: null
            });

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, 'foo@example.com');
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

            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, undefined);
            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, 'cust_mock_123456');
        });

        it('passes attribution data to the subscription metadata if provided', async function () {
            const mockCustomer = {
                id: mockCustomerId,
                email: mockCustomerEmail,
                name: mockCustomerName
            };

            await api.createCheckoutSession('priceId', mockCustomer, {
                metadata: {
                    attribution_id: '123',
                    attribution_url: '/',
                    attribution_type: 'url',
                    referrer_source: 'source',
                    referrer_medium: 'medium',
                    referrer_url: 'https://ghost.org/',
                    utm_source: 'newsletter',
                    utm_medium: 'email',
                    utm_campaign: 'spring_sale',
                    utm_term: 'ghost_pro',
                    utm_content: 'header_link'
                }
            });

            assert.deepEqual(mockStripe.checkout.sessions.create.args[0][0].subscription_data.metadata, {
                attribution_id: '123',
                attribution_url: '/',
                attribution_type: 'url',
                referrer_source: 'source',
                referrer_medium: 'medium',
                referrer_url: 'https://ghost.org/',
                utm_source: 'newsletter',
                utm_medium: 'email',
                utm_campaign: 'spring_sale',
                utm_term: 'ghost_pro',
                utm_content: 'header_link'
            });
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
            mockLabsIsSet = sinon.stub(mockLabs, 'isSet');
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

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
        });

        it('createCheckoutSetupSession does not send currency if additionalPaymentMethods flag is off', async function () {
            mockLabsIsSet.withArgs('additionalPaymentMethods').returns(false);
            await api.createCheckoutSetupSession('priceId', {currency: 'usd'});

            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.currency, undefined);
        });

        it('createCheckoutSetupSession sends currency if additionalPaymentMethods flag is on', async function () {
            mockLabsIsSet.withArgs('additionalPaymentMethods').returns(true);
            await api.createCheckoutSetupSession('priceId', {currency: 'usd'});

            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.currency, 'usd');
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

            it('returns undefined', async function () {
                const stripeCustomerId = await api.getCustomerIdByEmail(mockCustomerEmail);

                assert.equal(stripeCustomerId, undefined);
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

                assert.equal(stripeCustomerId, mockCustomerId);
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

                assert.equal(stripeCustomerId, 'recent_customer_id');
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

            assert.equal(mockStripe.subscriptions.update.callCount, 1);

            assert.equal(mockStripe.subscriptions.update.args[0][0], mockSubscription.id);
            assert.deepEqual(mockStripe.subscriptions.update.args[0][1], {trial_end: 'now'});

            assert.deepEqual(result, mockSubscription);
        });
    });

    describe('addCouponToSubscription', function () {
        const mockSubscription = {
            id: 'sub_123',
            status: 'active',
            discount: {
                coupon: {
                    id: 'coupon_abc'
                }
            }
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

        it('adds a coupon to a subscription', async function () {
            const result = await api.addCouponToSubscription('sub_123', 'coupon_abc');

            assert.equal(mockStripe.subscriptions.update.callCount, 1);
            assert.equal(mockStripe.subscriptions.update.args[0][0], 'sub_123');
            assert.deepEqual(mockStripe.subscriptions.update.args[0][1], {coupon: 'coupon_abc'});

            assert.deepEqual(result, mockSubscription);
        });
    });

    describe('updateSubscriptionTrialEnd', function () {
        const mockSubscription = {
            id: 'sub_456',
            status: 'active',
            trial_end: 1735689600
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

        it('updates trial_end with proration_behavior', async function () {
            const result = await api.updateSubscriptionTrialEnd('sub_456', 1735689600, {
                prorationBehavior: 'none'
            });

            assert.equal(mockStripe.subscriptions.update.callCount, 1);
            assert.equal(mockStripe.subscriptions.update.args[0][0], 'sub_456');
            assert.deepEqual(mockStripe.subscriptions.update.args[0][1], {
                trial_end: 1735689600,
                proration_behavior: 'none'
            });

            assert.deepEqual(result, mockSubscription);
        });
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
            mockLabsIsSet = sinon.stub(mockLabs, 'isSet');
            mockLabsIsSet.withArgs('stripeAutomaticTax').returns(true);
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
            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_update);
        });

        it('createCheckoutSession does not add customer_update if automatic tax flag is enabled and customer is undefined', async function () {
            await api.createCheckoutSession('priceId', undefined, {
                trialDays: null
            });
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_update, undefined);
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
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_update, undefined);
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

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
        });

        it('createDonationCheckoutSession does not send currency if additionalPaymentMethods flag is off', async function () {
            mockLabsIsSet.withArgs('additionalPaymentMethods').returns(false);
            await api.createDonationCheckoutSession('priceId', {currency: 'usd'});

            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.currency, undefined);
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

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, mockCustomerId);
        });

        it('passes customer_email when no customer object is provided', async function () {
            await api.createDonationCheckoutSession({
                priceId: 'priceId',
                successUrl: '/success',
                cancelUrl: '/cancel',
                metadata: {},
                customerEmail: mockCustomerEmail
            });

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, mockCustomerEmail);
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

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.customer);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer, mockCustomerId);
            assert.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.customer_email, undefined);
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

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.metadata);
            assert.deepEqual(mockStripe.checkout.sessions.create.firstCall.firstArg.metadata, metadata);
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

            assertExists(mockStripe.checkout.sessions.create.firstCall.firstArg.custom_fields);
            const customFields = mockStripe.checkout.sessions.create.firstCall.firstArg.custom_fields;
            assert.equal(customFields.length, 1);
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
            assert.deepEqual(customFields[0], {
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

            assert(mockStripe.checkout.sessions.create.firstCall.firstArg.custom_fields.length <= 3);
        });
    });
});
