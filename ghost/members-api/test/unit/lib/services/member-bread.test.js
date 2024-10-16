const assert = require('assert/strict');
const sinon = require('sinon');
const MemberBreadService = require('../../../../lib/services/MemberBREADService');
const moment = require('moment');

describe('MemberBreadService', function () {
    describe('read', function () {
        const MEMBER_ID = 123;
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
            emailSuppressionListStub;

        const getService = () => {
            return new MemberBreadService({
                settingsHelpers: {
                    createUnsubscribeUrl: sinon.stub().returns('https://example.com/unsubscribe/?uuid=123&key=456')
                },
                memberRepository: memberRepositoryStub,
                memberAttributionService: memberAttributionServiceStub,
                emailSuppressionList: emailSuppressionListStub
            });
        };

        beforeEach(function () {
            memberModelJSON = {
                id: MEMBER_ID,
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
                getMemberCreatedAttribution: sinon.stub().resolves(null)
            };
            emailSuppressionListStub = {
                getSuppressionData: sinon.stub().resolves({})
            };

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
            const subscriptionModels = subscriptionsJSON.map((subscription) => {
                const model = {
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
            const subscriptionModels = subscriptionsJSON.map((subscription) => {
                const model = {
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

            assert.equal(member.unsubscribe_url, 'https://example.com/unsubscribe/?uuid=123&key=456');
        });
    });
});
