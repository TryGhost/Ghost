const assert = require('assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const MemberRepository = require('../../../../lib/repositories/MemberRepository');
const {SubscriptionCreatedEvent} = require('@tryghost/member-events');
const {BadRequestError, NotFoundError} = require('@tryghost/errors');

const mockOfferRedemption = {
    add: sinon.stub()
};

describe('MemberRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('#isComplimentarySubscription', function () {
        it('Does not error when subscription.plan is null', function () {
            const repo = new MemberRepository({OfferRedemption: mockOfferRedemption});
            repo.isComplimentarySubscription({});
        });
    });

    describe('#resolveContextSource', function (){
        it('Maps context to source', function (){
            const repo = new MemberRepository({OfferRedemption: mockOfferRedemption});

            let source = repo._resolveContextSource({
                import: true
            });
            assert.equal(source, 'import');

            source = repo._resolveContextSource({
                importer: true
            });
            assert.equal(source, 'import');

            source = repo._resolveContextSource({
                user: true
            });
            assert.equal(source, 'admin');

            source = repo._resolveContextSource({
                user: true,
                api_key: true
            });
            assert.equal(source, 'api');

            source = repo._resolveContextSource({
                api_key: true
            });
            assert.equal(source, 'api');

            source = repo._resolveContextSource({
            });
            assert.equal(source, 'member');

            source = repo._resolveContextSource({
                generic_context: true
            });
            assert.equal(source, 'member');
        });
    });

    describe('setComplimentarySubscription', function () {
        let Member;
        let productRepository;

        beforeEach(function () {
            Member = {
                findOne: sinon.stub().resolves({
                    id: 'member_id_123',
                    related: () => {
                        return {
                            fetch: () => {
                                return {
                                    models: []
                                };
                            }
                        };
                    }
                })
            };
        });

        it('throws an error when there is no default product', async function () {
            productRepository = {
                getDefaultProduct: sinon.stub().resolves(null)
            };

            const repo = new MemberRepository({
                Member,
                stripeAPIService: {
                    configured: true
                },
                productRepository,
                OfferRedemption: mockOfferRedemption
            });

            try {
                await repo.setComplimentarySubscription({
                    id: 'member_id_123'
                }, {
                    transacting: true
                });

                assert.fail('setComplimentarySubscription should have thrown');
            } catch (err) {
                assert.equal(err.message, 'Could not find Product "default"');
            }
        });

        it('uses the right options for fetching default product', async function () {
            productRepository = {
                getDefaultProduct: sinon.stub().resolves({
                    toJSON: () => {
                        return null;
                    }
                })
            };

            const repo = new MemberRepository({
                Member,
                stripeAPIService: {
                    configured: true
                },
                productRepository,
                OfferRedemption: mockOfferRedemption
            });

            try {
                await repo.setComplimentarySubscription({
                    id: 'member_id_123'
                }, {
                    transacting: true,
                    withRelated: ['labels']
                });

                assert.fail('setComplimentarySubscription should have thrown');
            } catch (err) {
                productRepository.getDefaultProduct.calledWith({withRelated: ['stripePrices'], transacting: true}).should.be.true();
                assert.equal(err.message, 'Could not find Product "default"');
            }
        });
    });

    describe('linkSubscription', function (){
        let Member;
        let MemberPaidSubscriptionEvent;
        let StripeCustomerSubscription;
        let MemberProductEvent;
        let stripeAPIService;
        let productRepository;
        let offerRepository;
        let labsService;
        let subscriptionData;
        let notifySpy;

        afterEach(function () {
            sinon.restore();
        });

        beforeEach(async function () {
            notifySpy = sinon.spy();

            subscriptionData = {
                id: 'sub_123',
                customer: 'cus_123',
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: 'Monthly',
                            currency: 'usd',
                            recurring: {
                                interval: 'month'
                            },
                            unit_amount: 500,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: Date.now() / 1000,
                current_period_end: Date.now() / 1000 + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            };

            Member = {
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
            MemberPaidSubscriptionEvent = {
                add: sinon.stub().resolves()
            };
            StripeCustomerSubscription = {
                add: sinon.stub().resolves({
                    get: sinon.stub().returns()
                })
            };
            MemberProductEvent = {
                add: sinon.stub().resolves({})
            };

            stripeAPIService = {
                configured: true,
                getSubscription: sinon.stub().resolves(subscriptionData)
            };

            productRepository = {
                get: sinon.stub().resolves({
                    get: sinon.stub().returns(),
                    toJSON: sinon.stub().returns({})
                }),
                update: sinon.stub().resolves({})
            };

            labsService = {
                isSet: sinon.stub().returns(true)
            };

            offerRepository = {
                getById: sinon.stub().resolves({
                    id: 'offer_123'
                })
            };
        });

        it('dispatches paid subscription event', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                productRepository,
                labsService,
                Member,
                OfferRedemption: mockOfferRedemption
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            DomainEvents.subscribe(SubscriptionCreatedEvent, notifySpy);

            await repo.linkSubscription({
                subscription: subscriptionData
            }, {
                transacting: {
                    executionPromise: Promise.resolve()
                },
                context: {}
            });

            notifySpy.calledOnce.should.be.true();
        });

        it('attaches offer information to subscription event', async function (){
            const repo = new MemberRepository({
                stripeAPIService,
                StripeCustomerSubscription,
                MemberPaidSubscriptionEvent,
                MemberProductEvent,
                productRepository,
                offerRepository,
                labsService,
                Member,
                OfferRedemption: mockOfferRedemption
            });

            sinon.stub(repo, 'getSubscriptionByStripeID').resolves(null);

            DomainEvents.subscribe(SubscriptionCreatedEvent, notifySpy);

            await repo.linkSubscription({
                id: 'member_id_123',
                subscription: subscriptionData,
                offerId: 'offer_123'
            }, {
                transacting: {
                    executionPromise: Promise.resolve()
                },
                context: {}
            });

            notifySpy.calledOnce.should.be.true();
            notifySpy.calledWith(sinon.match((event) => {
                if (event.data.offerId === 'offer_123') {
                    return true;
                }
                return false;
            })).should.be.true();
        });
    });

    describe('forceSubscriptionToProduct', function () {
        const CUSTOMER_ID = 'abc123';
        const PRODUCT_ID = 'def456';
        const OPTIONS = {};
        let stripeCustomer, stripeCustomerSubscriptionItem, ghostProduct;

        beforeEach(function () {
            stripeCustomer = {
                subscriptions: {
                    data: [
                        {
                            id: 'sub_1',
                            items: {
                                data: [
                                    {
                                        id: 'sub_1_item_1',
                                        price: {
                                            id: 'sub_1_item_1_price_1',
                                            currency: 'usd',
                                            unit_amount: 500,
                                            type: 'recurring',
                                            recurring: {
                                                interval: 'month'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            };
            stripeCustomerSubscriptionItem = stripeCustomer.subscriptions.data[0].items.data[0];
            ghostProduct = {
                id: PRODUCT_ID,
                stripe_product_id: stripeCustomerSubscriptionItem.id,
                name: 'Premium Tier',
                monthly_price: stripeCustomerSubscriptionItem.price.unit_amount,
                yearly_price: stripeCustomerSubscriptionItem.price.unit_amount * 10,
                currency: stripeCustomerSubscriptionItem.price.currency
            };
        });

        /**
         * Returns a stubbed Stripe API service
         *
         * @param {Object} options
         * @param {Boolean} [options.configured] - Whether the Stripe API service is configured, defaults to true
         * @param {Boolean} [options.resolveCustomer] - Whether the Stripe API service should resolve the customer, defaults to true
         * @returns {Object}
         */
        const getStripeApiServiceStub = ({
            configured = true,
            resolveCustomer = true
        } = {}) => {
            const stripeAPIServiceStub = {
                configured,
                getCustomer: sinon.stub().resolves(null),
                updateSubscriptionItemPrice: sinon.stub().resolves(),
                createPrice: sinon.stub().resolves(),
                updatePrice: sinon.stub().resolves()
            };

            if (resolveCustomer) {
                stripeAPIServiceStub.getCustomer.withArgs(CUSTOMER_ID).resolves(stripeCustomer);
            }

            return stripeAPIServiceStub;
        };

        /**
         * Returns a stubbed product repository
         *
         * @param {Object} options
         * @param {String} [options.ghostProductStripePriceId] - The Stripe price ID of the Ghost product, defaults to the Stripe price ID of the Stripe customer's existing subscription
         * @param {Boolean} [options.resolveGhostProductPrice] - Whether the product repository should resolve the Ghost product price, defaults to true
         * @param {Boolean} [options.resolveStripeProduct] - Whether the product repository should resolve the Stripe product, defaults to true
         * @returns {Object}
         */
        const getProductRepositoryStub = ({
            ghostProductStripePriceId = stripeCustomerSubscriptionItem.price.id,
            resolveGhostProductPrice = true,
            resolveStripeProduct = true
        } = {}) => {
            // Ghost product price
            const priceStub = {
                get: sinon.stub().returns(null)
            };

            priceStub.get.withArgs('stripe_price_id').returns(ghostProductStripePriceId);

            // Ghost product
            const productStub = {
                related: sinon.stub().returns(null),
                get: key => ghostProduct[key]
            };

            productStub.related.withArgs('stripeProducts').returns({
                first: sinon.stub().returns(resolveStripeProduct ? productStub : null)
            });

            productStub.related.withArgs('stripePrices').returns({
                find: sinon.stub().returns(resolveGhostProductPrice ? priceStub : null)
            });

            // Product repository
            const productRepositoryStub = {
                get: sinon.stub().resolves(null),
                update: sinon.stub().resolves(productStub)
            };

            productRepositoryStub.get.withArgs(
                {id: PRODUCT_ID},
                {...OPTIONS, withRelated: ['stripePrices', 'stripeProducts']}
            ).resolves(productStub);

            return productRepositoryStub;
        };

        it('rejects when there is no Stripe connection', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub({configured: false});
            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub
            });

            await repo.forceStripeSubscriptionToProduct({}, OPTIONS).should.be.rejectedWith(
                BadRequestError,
                {message: 'Cannot force subscription to product without a Stripe Connection'}
            );
        });

        it('rejects when the Stripe customer cannot be retrieved', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub({resolveCustomer: false});
            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub
            });

            await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                BadRequestError,
                {message: 'Cannot find Stripe customer to force subscription'}
            );
        });

        it('rejects when the Stripe customer has no existing subscription', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();

            stripeCustomer.subscriptions.data = [];

            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub
            });

            await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                BadRequestError,
                {message: 'Cannot force subscription when customer does not have an existing subscription'}
            );
        });

        it('rejects when the Stripe customer has multiple subscriptions', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();

            stripeCustomer.subscriptions.data.push({
                id: 'sub_2',
                items: {
                    data: [
                        {
                            id: 'sub_2_item_1',
                            price: {
                                id: 'sub_2_item_1_price_1',
                                recurring: {
                                    interval: 'month'
                                }
                            }
                        }
                    ]
                }
            });

            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub
            });

            await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                BadRequestError,
                {message: 'Cannot force subscription when customer has multiple subscriptions'}
            );
        });

        it('rejects when the Stripe customer has subscription with multiple items', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();

            stripeCustomer.subscriptions.data[0].items.data.push({
                id: 'sub_1_item_1',
                price: {
                    id: 'sub_1_item_1_price_2',
                    recurring: {
                        interval: 'month'
                    }
                }
            });

            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub
            });

            await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                BadRequestError,
                {message: 'Cannot force subscription when existing subscription has multiple items'}
            );
        });

        it('rejects when the Stripe customer has subscription that is not recurring', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();

            delete stripeCustomer.subscriptions.data[0].items.data[0].price.recurring;

            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub
            });

            await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                BadRequestError,
                {message: 'Cannot force subscription when existing subscription is not recurring'}
            );
        });

        it('rejects when the Ghost product can not be retrieved', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const productRepositoryStub = {
                get: sinon.stub().resolves({}) // Ensure truthy value is resolved
            };

            productRepositoryStub.get.withArgs(
                {id: PRODUCT_ID},
                {...OPTIONS, withRelated: ['stripePrices', 'stripeProducts']}
            ).resolves(null);

            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });

            await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID,
                product_id: PRODUCT_ID
            }, OPTIONS).should.be.rejectedWith(
                NotFoundError,
                {message: `Could not find Product ${PRODUCT_ID}`}
            );
        });

        it('does not update the Stripe customer\'s subscription if they already have a subscription to the Ghost product', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const productRepositoryStub = getProductRepositoryStub();
            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });
            const result = await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID,
                product_id: PRODUCT_ID
            }, OPTIONS);

            result.stripePriceId.should.equal(stripeCustomerSubscriptionItem.price.id);
            result.isNewStripePrice.should.be.false();

            stripeAPIServiceStub.updateSubscriptionItemPrice.calledOnce.should.be.false();
        });

        it('updates the Stripe customer\'s subscription if they already have a subscription, but to some other Ghost product', async function () {
            const GHOST_PRODUCT_STRIPE_PRICE_ID = 'some_other_ghost_product';
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const productRepositoryStub = getProductRepositoryStub({
                ghostProductStripePriceId: GHOST_PRODUCT_STRIPE_PRICE_ID
            });
            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });
            const result = await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID,
                product_id: PRODUCT_ID
            }, OPTIONS);

            result.stripePriceId.should.equal(GHOST_PRODUCT_STRIPE_PRICE_ID);
            result.isNewStripePrice.should.be.false();

            stripeAPIServiceStub.updateSubscriptionItemPrice.calledOnce.should.be.true();
            stripeAPIServiceStub.updateSubscriptionItemPrice.calledWithExactly(
                stripeCustomer.subscriptions.data[0].id,
                stripeCustomerSubscriptionItem.id,
                GHOST_PRODUCT_STRIPE_PRICE_ID
            ).should.be.true();
        });

        it('creates a new price on the Stripe product matching the Stripe customer\'s existing subscription and updates the subscription', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const stripeSubscriptionItem = stripeCustomerSubscriptionItem;
            const NEW_STRIPE_PRICE_ID = 'new_stripe_price_id';

            stripeAPIServiceStub.createPrice.withArgs({
                product: stripeSubscriptionItem.id,
                active: true,
                nickname: 'Monthly',
                currency: stripeSubscriptionItem.price.currency,
                amount: stripeSubscriptionItem.price.unit_amount,
                type: stripeSubscriptionItem.price.type,
                interval: stripeSubscriptionItem.price.recurring.interval
            }).resolves({
                id: NEW_STRIPE_PRICE_ID
            });

            const productRepositoryStub = getProductRepositoryStub({
                resolveGhostProductPrice: false
            });
            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });
            const result = await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID,
                product_id: PRODUCT_ID
            }, OPTIONS);

            // Assert new price was created
            result.stripePriceId.should.equal(NEW_STRIPE_PRICE_ID);
            result.isNewStripePrice.should.be.true();

            // Assert subscription was updated
            stripeAPIServiceStub.updateSubscriptionItemPrice.calledOnce.should.be.true();
            stripeAPIServiceStub.updateSubscriptionItemPrice.calledWithExactly(
                stripeCustomer.subscriptions.data[0].id,
                stripeCustomerSubscriptionItem.id,
                NEW_STRIPE_PRICE_ID
            ).should.be.true();

            // Assert `result.archiveStripePrice` archives the new price when executed
            await result.archiveStripePrice();

            stripeAPIServiceStub.updatePrice.calledWithExactly(
                NEW_STRIPE_PRICE_ID,
                {active: false}
            ).should.be.true();
        });

        it('creates a new product in Stripe if one does not already existing for the Ghost product', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const productRepositoryStub = getProductRepositoryStub({
                resolveStripeProduct: false
            });
            const repo = new MemberRepository({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });

            await repo.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID,
                product_id: PRODUCT_ID
            }, OPTIONS);

            productRepositoryStub.update.calledOnce.should.be.true();
            productRepositoryStub.update.calledWithExactly(
                {
                    id: PRODUCT_ID,
                    name: ghostProduct.name,
                    monthly_price: {
                        amount: ghostProduct.monthly_price,
                        currency: ghostProduct.currency
                    },
                    yearly_price: {
                        amount: ghostProduct.yearly_price,
                        currency: ghostProduct.currency
                    }
                },
                OPTIONS
            ).should.be.true();
        });
    });
});
