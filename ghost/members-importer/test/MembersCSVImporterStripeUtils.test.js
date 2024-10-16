const sinon = require('sinon');
const {DataImportError} = require('@tryghost/errors');
const MembersCSVImporterStripeUtils = require('../lib/MembersCSVImporterStripeUtils');

describe('MembersCSVImporterStripeUtils', function () {
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

    describe('forceSubscriptionToProduct', function () {
        it('rejects when there is no Stripe connection', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub({configured: false});
            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({}, OPTIONS).should.be.rejectedWith(
                DataImportError,
                {message: 'Cannot force subscription to product without a Stripe Connection'}
            );
        });

        it('rejects when the Stripe customer cannot be retrieved', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub({resolveCustomer: false});
            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                DataImportError,
                {message: 'Cannot find Stripe customer to update subscription'}
            );
        });

        it('rejects when the Stripe customer has no existing subscription', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();

            stripeCustomer.subscriptions.data = [];

            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                DataImportError,
                {message: 'Cannot update subscription when customer does not have an existing subscription'}
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

            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                DataImportError,
                {message: 'Cannot update subscription when customer has multiple subscriptions'}
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

            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                DataImportError,
                {message: 'Cannot update subscription when existing subscription has multiple items'}
            );
        });

        it('rejects when the Stripe customer has subscription that is not recurring', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();

            delete stripeCustomer.subscriptions.data[0].items.data[0].price.recurring;

            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID
            }, OPTIONS).should.be.rejectedWith(
                DataImportError,
                {message: 'Cannot update subscription when existing subscription is not recurring'}
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

            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID,
                product_id: PRODUCT_ID
            }, OPTIONS).should.be.rejectedWith(
                DataImportError,
                {message: `Cannot find Product ${PRODUCT_ID}`}
            );
        });

        it('does not update the Stripe customer\'s subscription if they already have a subscription to the Ghost product', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const productRepositoryStub = getProductRepositoryStub();
            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });
            const result = await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
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
            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });
            const result = await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
                customer_id: CUSTOMER_ID,
                product_id: PRODUCT_ID
            }, OPTIONS);

            result.stripePriceId.should.equal(GHOST_PRODUCT_STRIPE_PRICE_ID);
            result.isNewStripePrice.should.be.false();

            stripeAPIServiceStub.updateSubscriptionItemPrice.calledOnce.should.be.true();
            stripeAPIServiceStub.updateSubscriptionItemPrice.calledWithExactly(
                stripeCustomer.subscriptions.data[0].id,
                stripeCustomerSubscriptionItem.id,
                GHOST_PRODUCT_STRIPE_PRICE_ID,
                {prorationBehavior: 'none'}
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
            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });
            const result = await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
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
                NEW_STRIPE_PRICE_ID,
                {prorationBehavior: 'none'}
            ).should.be.true();
        });

        it('creates a new product in Stripe if one does not already existing for the Ghost product', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const productRepositoryStub = getProductRepositoryStub({
                resolveStripeProduct: false
            });
            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub,
                productRepository: productRepositoryStub
            });

            await membersCSVImporterStripeUtils.forceStripeSubscriptionToProduct({
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

    describe('archivePrice', function () {
        it('archives a Stripe price', async function () {
            const stripeAPIServiceStub = getStripeApiServiceStub();
            const membersCSVImporterStripeUtils = new MembersCSVImporterStripeUtils({
                stripeAPIService: stripeAPIServiceStub
            });
            const stripePriceId = 'price_123';

            await membersCSVImporterStripeUtils.archivePrice(stripePriceId);

            stripeAPIServiceStub.updatePrice.calledOnce.should.be.true();
            stripeAPIServiceStub.updatePrice.calledWithExactly(stripePriceId, {active: false}).should.be.true();
        });
    });
});
