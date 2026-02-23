const assert = require('node:assert/strict');
const sinon = require('sinon');
const MemberBreadService = require('../../../../../../../core/server/services/members/members-api/services/member-bread-service');
const NextPaymentCalculator = require('../../../../../../../core/server/services/members/members-api/services/next-payment-calculator');
const moment = require('moment');

describe('MemberBreadService', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('add', function () {
        // Helper to create a mock member model
        function createMockMemberModel(overrides = {}) {
            return {
                id: 'member_123',
                get: sinon.stub().callsFake((key) => {
                    const data = {
                        id: 'member_123',
                        uuid: 'uuid-123',
                        email: 'test@example.com',
                        name: 'Test User',
                        status: 'free',
                        email_disabled: false,
                        ...overrides
                    };
                    return data[key];
                }),
                related: sinon.stub().returns({toJSON: () => [], models: []}),
                toJSON: sinon.stub().returns({
                    id: 'member_123',
                    uuid: 'uuid-123',
                    email: 'test@example.com',
                    name: 'Test User',
                    status: 'free',
                    subscriptions: [],
                    ...overrides
                })
            };
        }

        // Helper to create a properly mocked service
        function createService(memberRepositoryOverrides = {}) {
            const mockMemberModel = createMockMemberModel();

            const linkStripeCustomerStub = sinon.stub().resolves();
            const createStub = sinon.stub().resolves(mockMemberModel);

            const memberRepository = {
                create: createStub,
                linkStripeCustomer: linkStripeCustomerStub,
                ...memberRepositoryOverrides
            };

            const service = new MemberBreadService({
                memberRepository,
                stripeService: {configured: true},
                memberAttributionService: {getAttributionFromContext: sinon.stub().resolves(null)},
                emailService: {},
                labsService: {isSet: sinon.stub().returns(false)},
                newslettersService: {browse: sinon.stub().resolves([])},
                settingsCache: {get: sinon.stub()},
                emailSuppressionList: {getSuppressionData: sinon.stub().resolves({suppressed: false, info: null})},
                settingsHelpers: {createUnsubscribeUrl: sinon.stub().returns('http://example.com/unsubscribe')}
            });

            // Stub the read method to avoid having to mock all its dependencies
            sinon.stub(service, 'read').resolves({
                id: 'member_123',
                email: 'test@example.com',
                name: 'Test User',
                status: 'free'
            });

            return {service, memberRepository, linkStripeCustomerStub, createStub};
        }

        it('passes context to linkStripeCustomer when stripe_customer_id is provided', async function () {
            // This test verifies that when a member is created via Admin API with a stripe_customer_id,
            // the context (containing {user: true}) is passed through to linkStripeCustomer.
            // This is important because linkStripeCustomer -> linkSubscription uses context
            // to determine the source for welcome emails. Without context, the source defaults
            // to 'member', causing welcome emails to be incorrectly sent for admin-created members.

            const {service, linkStripeCustomerStub} = createService();

            // Call add with admin context and stripe_customer_id
            await service.add({
                email: 'test@example.com',
                name: 'Test User',
                stripe_customer_id: 'cus_123'
            }, {
                context: {user: true} // Admin context
            });

            // Verify linkStripeCustomer was called
            assert.equal(linkStripeCustomerStub.calledOnce, true, 'linkStripeCustomer should be called once');

            // Get the options passed to linkStripeCustomer
            const linkStripeCustomerOptions = linkStripeCustomerStub.firstCall.args[1];

            // Verify the context is passed through so that linkStripeCustomer -> linkSubscription
            // can correctly determine that this is an admin-created member and NOT send a welcome email.
            assert.ok(linkStripeCustomerOptions.context, 'context should be passed to linkStripeCustomer');
            assert.equal(linkStripeCustomerOptions.context.user, true, 'context.user should be true');
        });

        it('passes context to linkStripeCustomer when transacting and stripe_customer_id are both provided', async function () {
            const {service, linkStripeCustomerStub} = createService();
            const mockTransaction = {executionPromise: Promise.resolve()};

            // Call add with admin context, stripe_customer_id, and a transaction
            await service.add({
                email: 'test@example.com',
                name: 'Test User',
                stripe_customer_id: 'cus_456'
            }, {
                context: {user: true},
                transacting: mockTransaction
            });

            // Verify linkStripeCustomer was called
            assert.equal(linkStripeCustomerStub.calledOnce, true, 'linkStripeCustomer should be called once');

            // Get the options passed to linkStripeCustomer
            const linkStripeCustomerOptions = linkStripeCustomerStub.firstCall.args[1];

            // Should have both transacting AND context
            assert.equal(linkStripeCustomerOptions.transacting, mockTransaction, 'transacting should be passed');
            assert.ok(linkStripeCustomerOptions.context, 'context should also be passed');
            assert.equal(linkStripeCustomerOptions.context.user, true, 'context.user should be true');
        });

        it('passes import context to linkStripeCustomer', async function () {
            const {service, linkStripeCustomerStub} = createService();

            // Call add with import context
            await service.add({
                email: 'import-test@example.com',
                name: 'Imported User',
                stripe_customer_id: 'cus_789'
            }, {
                context: {import: true}
            });

            const linkStripeCustomerOptions = linkStripeCustomerStub.firstCall.args[1];

            // Import context should also be passed through
            assert.ok(linkStripeCustomerOptions.context, 'context should be passed to linkStripeCustomer');
            assert.equal(linkStripeCustomerOptions.context.import, true, 'context.import should be true');
        });
    });

    describe('read', function () {
        const MEMBER_ID = 123;
        const MEMBER_UUID = 'abcd-efgh';
        const DEFAULT_RELATIONS = [
            'labels',
            'stripeSubscriptions',
            'stripeSubscriptions.customer',
            'stripeSubscriptions.stripePrice',
            'stripeSubscriptions.stripePrice.stripeProduct',
            'stripeSubscriptions.stripePrice.stripeProduct.product',
            'products',
            'newsletters',
            'productEvents'
        ];

        let memberModelStub,
            memberModelJSON,
            memberRepositoryStub,
            memberAttributionServiceStub,
            emailSuppressionListStub,
            nextPaymentCalculator;

        const defaultOffersAPI = {
            getOffer: sinon.stub().resolves(null),
            getRedeemedOfferIdsForSubscriptions: sinon.stub().resolves([])
        };

        const getService = (options = {}) => {
            return new MemberBreadService({
                settingsHelpers: {
                    createUnsubscribeUrl: sinon.stub().callsFake(uuid => `https://example.com/unsubscribe/?uuid=${uuid}&key=456`)
                },
                memberRepository: memberRepositoryStub,
                memberAttributionService: memberAttributionServiceStub,
                emailSuppressionList: emailSuppressionListStub,
                nextPaymentCalculator: options.nextPaymentCalculator || nextPaymentCalculator,
                offersAPI: options.offersAPI || defaultOffersAPI
            });
        };

        beforeEach(function () {
            memberModelJSON = {
                id: MEMBER_ID,
                uuid: MEMBER_UUID,
                name: 'foo bar',
                email: 'foo@bar.baz',
                subscriptions: []
            };
            memberModelStub = {
                id: MEMBER_ID,
                related: sinon.stub().returns([]),
                toJSON: sinon.stub().returns({...memberModelJSON}),
                get: function (key) {
                    return this[key];
                }
            };
            memberRepositoryStub = {
                get: sinon.stub().resolves(null),
                related: sinon.stub().returns([])
            };
            memberAttributionServiceStub = {
                getMemberCreatedAttribution: sinon.stub().resolves(null),
                getSubscriptionCreatedAttribution: sinon.stub().resolves(null)
            };
            emailSuppressionListStub = {
                getSuppressionData: sinon.stub().resolves({})
            };
            nextPaymentCalculator = new NextPaymentCalculator();

            memberRepositoryStub.get
                .withArgs(
                    {id: MEMBER_ID},
                    {withRelated: DEFAULT_RELATIONS}
                )
                .resolves(memberModelStub);
        });

        it('returns a member', async function () {
            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.equal(member.id, memberModelJSON.id);
            assert.equal(member.email, memberModelJSON.email);
        });

        it('returns a member with subscriptions', async function () {
            const subscriptionsJSON = [
                {
                    subscription_id: 'sub_123',
                    price: {}
                }
            ];
            const subscriptionModels = [
                {
                    id: '1',
                    get: sinon.stub()
                }
            ];

            subscriptionModels[0].get
                .withArgs('subscription_id')
                .returns(subscriptionsJSON[0].subscription_id);

            memberModelStub.related
                .withArgs('stripeSubscriptions')
                .returns(subscriptionModels);

            memberModelStub.toJSON.returns({
                ...memberModelJSON,
                subscriptions: subscriptionsJSON
            });

            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.deepEqual(member.subscriptions, subscriptionsJSON);
        });

        it('returns a member with subscriptions that only have a price', async function () {
            const subscriptionsJSON = [
                {
                    subscription_id: 'sub_123',
                    price: {}
                },
                {
                    subscription_id: 'sub_456'
                }
            ];
            const subscriptionModels = subscriptionsJSON.map((subscription, index) => {
                const model = {
                    id: `${index + 1}`,
                    get: sinon.stub()
                };

                model.get.withArgs('subscription_id').returns(subscription.subscription_id);
                model.get.withArgs('offer_id').returns(undefined);

                return model;
            });

            memberModelStub.related
                .withArgs('stripeSubscriptions')
                .returns(subscriptionModels);

            memberModelStub.toJSON.returns({
                ...memberModelJSON,
                subscriptions: subscriptionsJSON
            });

            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.deepEqual(member.subscriptions, [
                subscriptionsJSON[0]
            ]);
        });

        it('returns a member with a comped subscription', async function () {
            const productsJSON = [
                {
                    id: 'prod_123',
                    expiry_at: new Date('2023-10-13T15:15:00')
                },
                {
                    id: 'prod_456',
                    expiry_at: new Date('2023-10-13T15:15:00')
                }
            ];
            const productEventsJSON = [
                {
                    product_id: productsJSON[0].id,
                    created_at: new Date('2023-09-13T15:15:00'),
                    action: 'added'
                },
                {
                    product_id: productsJSON[1].id,
                    created_at: new Date('2023-09-13T15:20:00'),
                    action: 'added'
                }
            ];
            const subscriptionsJSON = [
                {
                    subscription_id: 'sub_123',
                    price: {
                        product: {
                            product_id: productsJSON[0].id
                        }
                    },
                    status: 'cancelled',
                    product_id: productsJSON[0].id
                },
                // Comped subscription - Has no price
                {
                    subscription_id: 'sub_456',
                    status: 'active',
                    product_id: productsJSON[1].id
                }
            ];
            const subscriptionModels = subscriptionsJSON.map((subscription, index) => {
                const model = {
                    id: `${index + 1}`,
                    get: sinon.stub()
                };

                model.get.withArgs('subscription_id').returns(subscription.subscription_id);
                model.get.withArgs('offer_id').returns(undefined);

                return model;
            });

            memberModelStub.related
                .withArgs('stripeSubscriptions')
                .returns(subscriptionModels);

            memberModelStub.toJSON.returns({
                ...memberModelJSON,
                subscriptions: subscriptionsJSON,
                products: productsJSON,
                productEvents: productEventsJSON
            });

            memberRepositoryStub.isActiveSubscriptionStatus = sinon.stub().returns(true);

            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            // Ensure only 2 subscriptions are returned
            assert.equal(member.subscriptions.length, 2);

            const compedSubscription = member.subscriptions[1];

            // Ensure the 2nd subscription is the comped one
            sinon.assert.match(compedSubscription, {
                id: '',
                tier: productsJSON[1],
                customer: {
                    id: '',
                    name: memberModelJSON.name,
                    email: memberModelJSON.email
                },
                plan: {
                    id: '',
                    nickname: 'Complimentary',
                    interval: 'year',
                    currency: 'USD',
                    amount: 0
                },
                status: 'active',
                start_date: moment(productEventsJSON[1].created_at),
                default_payment_card_last4: '****',
                cancel_at_period_end: false,
                cancellation_reason: null,
                current_period_end: moment(productsJSON[1].expiry_at),
                price: {
                    id: '',
                    price_id: '',
                    nickname: 'Complimentary',
                    amount: 0,
                    interval: 'year',
                    type: 'recurring',
                    currency: 'USD',
                    product: {
                        id: '',
                        product_id: productsJSON[1].id
                    }
                }
            });
        });

        it('returns a member with attribution data', async function () {
            const attributionData = {
                url: 'https://example.com'
            };

            memberAttributionServiceStub.getMemberCreatedAttribution
                .withArgs(MEMBER_ID)
                .resolves(attributionData);

            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.deepEqual(member.attribution, attributionData);
        });

        it('returns a member with suppression data', async function () {
            emailSuppressionListStub.getSuppressionData
                .withArgs(memberModelJSON.email)
                .resolves({
                    suppressed: true,
                    info: 'bounce'
                });

            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.deepEqual(member.email_suppression, {
                suppressed: true,
                info: 'bounce'
            });
        });

        it('returns a member with an unsubscribe url', async function () {
            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.equal(member.unsubscribe_url, `https://example.com/unsubscribe/?uuid=${MEMBER_UUID}&key=456`);
        });

        it('returns member with next_payment amount for subscriptions without discount', async function () {
            const subscriptionsJSON = [
                {
                    id: 'sub_123',
                    subscription_id: 'sub_123',
                    status: 'active',
                    plan: {
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    price: {
                        product: {
                            product_id: 'prod_123'
                        }
                    }
                }
            ];
            const subscriptionModels = subscriptionsJSON.map((subscription, index) => {
                const model = {
                    id: `${index + 1}`,
                    get: sinon.stub()
                };

                model.get.withArgs('subscription_id').returns(subscription.subscription_id);
                model.get.withArgs('offer_id').returns(undefined);

                return model;
            });

            memberModelStub.related
                .withArgs('stripeSubscriptions')
                .returns(subscriptionModels);

            memberModelStub.toJSON.returns({
                ...memberModelJSON,
                subscriptions: subscriptionsJSON
            });

            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.equal(member.subscriptions.length, 1);
            assert.ok(member.subscriptions[0].next_payment !== undefined, 'next_payment should be defined');
            assert.equal(member.subscriptions[0].next_payment.original_amount, 500);
            assert.equal(member.subscriptions[0].next_payment.amount, 500);
            assert.equal(member.subscriptions[0].next_payment.interval, 'month');
            assert.equal(member.subscriptions[0].next_payment.currency, 'USD');
            assert.equal(member.subscriptions[0].next_payment.discount, null);
        });

        it('returns member with next_payment amount for subscriptions with discount', async function () {
            const offerId = 'offer_abc123';
            const discountStart = new Date('2020-01-01T00:00:00.000Z');
            const discountEnd = new Date('2099-12-31T00:00:00.000Z');

            const subscriptionsJSON = [
                {
                    id: 'sub_123',
                    subscription_id: 'sub_123',
                    status: 'active',
                    plan: {
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    price: {
                        product: {
                            product_id: 'prod_123'
                        }
                    },
                    discount_start: discountStart,
                    discount_end: discountEnd,
                    current_period_end: new Date('2099-06-15T00:00:00.000Z')
                }
            ];
            const subscriptionModels = subscriptionsJSON.map((subscription, index) => {
                const model = {
                    id: `${index + 1}`,
                    get: sinon.stub()
                };

                model.get.withArgs('subscription_id').returns(subscription.subscription_id);
                model.get.withArgs('offer_id').returns(offerId);

                return model;
            });

            memberModelStub.related
                .withArgs('stripeSubscriptions')
                .returns(subscriptionModels);

            memberModelStub.toJSON.returns({
                ...memberModelJSON,
                subscriptions: subscriptionsJSON
            });

            const offerDTO = {
                id: offerId,
                name: 'Test Offer',
                type: 'percent',
                amount: 20,
                duration: 'repeating',
                duration_in_months: 12
            };

            const offersAPIStub = {
                getOffer: sinon.stub().withArgs({id: offerId}).resolves(offerDTO),
                getRedeemedOfferIdsForSubscriptions: sinon.stub().resolves([{subscription_id: '1', offer_id: offerId}])
            };

            const memberBreadService = getService({
                offersAPI: offersAPIStub
            });

            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.equal(member.subscriptions.length, 1);
            const nextPayment = member.subscriptions[0].next_payment;

            assert.ok(nextPayment !== undefined, 'next_payment should be defined');
            assert.equal(nextPayment.original_amount, 500);
            assert.equal(nextPayment.amount, 400); // 500 - 20% = 400
            assert.equal(nextPayment.interval, 'month');
            assert.equal(nextPayment.currency, 'USD');

            assert.ok(nextPayment.discount !== null, 'discount should not be null');
            assert.equal(nextPayment.discount.offer_id, offerId);
            assert.equal(nextPayment.discount.type, 'percent');
            assert.equal(nextPayment.discount.amount, 20);
            assert.equal(nextPayment.discount.duration, 'repeating');
        });

        it('attaches offer_redemptions to subscriptions', async function () {
            const offerId1 = 'offer_signup_1';
            const offerId2 = 'offer_retention_1';

            const subscriptionsJSON = [
                {
                    id: 'sub_123',
                    subscription_id: 'sub_123',
                    status: 'active',
                    plan: {
                        amount: 500,
                        interval: 'month',
                        currency: 'USD'
                    },
                    price: {
                        product: {
                            product_id: 'prod_123'
                        }
                    }
                }
            ];
            const subscriptionModels = subscriptionsJSON.map((subscription, index) => {
                const model = {
                    id: `${index + 1}`,
                    get: sinon.stub()
                };

                model.get.withArgs('subscription_id').returns(subscription.subscription_id);
                model.get.withArgs('offer_id').returns(offerId2);

                return model;
            });

            memberModelStub.related
                .withArgs('stripeSubscriptions')
                .returns(subscriptionModels);

            memberModelStub.toJSON.returns({
                ...memberModelJSON,
                subscriptions: subscriptionsJSON
            });

            const offerDTO1 = {
                id: offerId1,
                name: 'Signup Offer',
                type: 'percent',
                amount: 10,
                duration: 'once'
            };
            const offerDTO2 = {
                id: offerId2,
                name: 'Retention Offer',
                type: 'percent',
                amount: 20,
                duration: 'repeating',
                duration_in_months: 3
            };

            const offersAPIStub = {
                getOffer: sinon.stub().callsFake(async ({id}) => {
                    if (id === offerId1) {
                        return offerDTO1;
                    }
                    if (id === offerId2) {
                        return offerDTO2;
                    }
                    return null;
                }),
                getRedeemedOfferIdsForSubscriptions: sinon.stub().resolves([
                    {subscription_id: '1', offer_id: offerId1},
                    {subscription_id: '1', offer_id: offerId2}
                ])
            };

            const memberBreadService = getService({
                offersAPI: offersAPIStub
            });

            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.equal(member.subscriptions.length, 1);

            // subscription.offer should be the current active offer (from offer_id)
            assert.equal(member.subscriptions[0].offer.id, offerId2);
            assert.equal(member.subscriptions[0].offer.name, 'Retention Offer');

            // subscription.offer_redemptions should be all redeemed offers (from offer_redemptions)
            assert.equal(member.subscriptions[0].offer_redemptions.length, 2);
            assert.equal(member.subscriptions[0].offer_redemptions[0].id, offerId1);
            assert.equal(member.subscriptions[0].offer_redemptions[0].name, 'Signup Offer');
            assert.equal(member.subscriptions[0].offer_redemptions[1].id, offerId2);
            assert.equal(member.subscriptions[0].offer_redemptions[1].name, 'Retention Offer');
        });

        it('returns empty offer_redemptions when no redemptions exist', async function () {
            const subscriptionsJSON = [
                {
                    id: 'sub_123',
                    subscription_id: 'sub_123',
                    price: {
                        product: {
                            product_id: 'prod_123'
                        }
                    }
                }
            ];
            const subscriptionModels = subscriptionsJSON.map((subscription, index) => {
                const model = {
                    id: `${index + 1}`,
                    get: sinon.stub()
                };

                model.get.withArgs('subscription_id').returns(subscription.subscription_id);
                model.get.withArgs('offer_id').returns(undefined);

                return model;
            });

            memberModelStub.related
                .withArgs('stripeSubscriptions')
                .returns(subscriptionModels);

            memberModelStub.toJSON.returns({
                ...memberModelJSON,
                subscriptions: subscriptionsJSON
            });

            const memberBreadService = getService();
            const member = await memberBreadService.read({id: MEMBER_ID});

            assert.equal(member.subscriptions.length, 1);
            assert.equal(member.subscriptions[0].offer, null);
            assert.deepEqual(member.subscriptions[0].offer_redemptions, []);
        });
    });
});
