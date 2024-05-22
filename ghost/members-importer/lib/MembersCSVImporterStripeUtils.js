const {DataImportError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    productNotFound: 'Cannot find Product {id}',
    noStripeConnection: 'Cannot {action} without a Stripe Connection',
    forceNoCustomer: 'Cannot find Stripe customer to update subscription',
    forceNoExistingSubscription: 'Cannot update subscription when customer does not have an existing subscription',
    forceTooManySubscriptions: 'Cannot update subscription when customer has multiple subscriptions',
    forceTooManySubscriptionItems: 'Cannot update subscription when existing subscription has multiple items',
    forceExistingSubscriptionNotRecurring: 'Cannot update subscription when existing subscription is not recurring'
};

module.exports = class MembersCSVImporterStripeUtils {
    /**
     * @param {Object} stripeAPIService
     * @param {Object} productRepository
     */
    constructor({
        stripeAPIService,
        productRepository
    }) {
        this._stripeAPIService = stripeAPIService;
        this._productRepository = productRepository;
    }

    /**
     * Force a Stripe customer to be subscribed to a specific Ghost product
     *
     * This will either:
     *
     * Create a new price on the Stripe product that is associated with the Ghost product, then update
     * the customer's Stripe subscription to use the new price. The new price will be created with the details of the
     * existing price of the item in customer's Stripe subscription
     *
     * or
     *
     * Update the customer's stripe subscription to use an existing price on the Stripe product that matches the
     * details of the existing price of the item in customer's Stripe subscription
     *
     * If there is no Stripe product associated with the Ghost product, one will be created
     *
     * This method should be used in-conjunction with `MembersRepository.linkSubscription` to ensure
     * that the changes made in Stripe are reflected in Ghost - This is not executed as part of this to allow for
     * flexibility and reduce duplication
     *
     * @param {Object} data
     * @param {String} data.customer_id - Stripe customer ID
     * @param {String} data.product_id - Ghost product ID
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async forceStripeSubscriptionToProduct(data, options) {
        if (!this._stripeAPIService.configured) {
            throw new DataImportError({
                message: tpl(messages.noStripeConnection, {action: 'force subscription to product'})
            });
        }

        // Retrieve customer's existing subscription information
        const stripeCustomer = await this._stripeAPIService.getCustomer(data.customer_id);

        // Subscription can only be forced if the customer exists
        if (!stripeCustomer) {
            throw new DataImportError({message: tpl(messages.forceNoCustomer)});
        }

        // Subscription can only be forced if the customer has an existing subscription
        if (stripeCustomer.subscriptions.data.length === 0) {
            throw new DataImportError({message: tpl(messages.forceNoExistingSubscription)});
        }

        // Subscription can only be forced if the customer does not have multiple subscriptions
        if (stripeCustomer.subscriptions.data.length > 1) {
            throw new DataImportError({message: tpl(messages.forceTooManySubscriptions)});
        }

        const stripeSubscription = stripeCustomer.subscriptions.data[0];

        // Subscription can only be forced if the existing subscription does not have multiple items
        if (stripeSubscription.items.data.length > 1) {
            throw new DataImportError({message: tpl(messages.forceTooManySubscriptionItems)});
        }

        const stripeSubscriptionItem = stripeSubscription.items.data[0];
        const stripeSubscriptionItemPrice = stripeSubscriptionItem.price;
        const stripeSubscriptionItemPriceCurrency = stripeSubscriptionItemPrice.currency;
        const stripeSubscriptionItemPriceAmount = stripeSubscriptionItemPrice.unit_amount;
        const stripeSubscriptionItemPriceType = stripeSubscriptionItemPrice.type;
        const stripeSubscriptionItemPriceInterval = stripeSubscriptionItemPrice.recurring?.interval || null;

        // Subscription can only be forced if the existing subscription has a recurring interval
        if (!stripeSubscriptionItemPriceInterval) {
            throw new DataImportError({message: tpl(messages.forceExistingSubscriptionNotRecurring)});
        }

        // Retrieve Ghost product
        let ghostProduct = await this._productRepository.get(
            {id: data.product_id},
            {...options, withRelated: ['stripePrices', 'stripeProducts']}
        );

        if (!ghostProduct) {
            throw new DataImportError({message: tpl(messages.productNotFound, {id: data.product_id})});
        }

        // If there is not a Stripe product associated with the Ghost product, ensure one is created before continuing
        if (!ghostProduct.related('stripeProducts').first()) {
            // Even though we are not updating any information on the product, calling `ProductRepository.update`
            // will ensure that the product gets created in Stripe
            ghostProduct = await this._productRepository.update({
                id: data.product_id,
                name: ghostProduct.get('name'),
                // Providing the pricing details will ensure the relevant prices for the Ghost product are created
                // on the Stripe product
                monthly_price: {
                    amount: ghostProduct.get('monthly_price'),
                    currency: ghostProduct.get('currency')
                },
                yearly_price: {
                    amount: ghostProduct.get('yearly_price'),
                    currency: ghostProduct.get('currency')
                }
            }, options);
        }

        // Find price on Ghost product matching stripe subscription item price details
        const ghostProductPrice = ghostProduct.related('stripePrices').find((price) => {
            return price.get('currency') === stripeSubscriptionItemPriceCurrency &&
                price.get('amount') === stripeSubscriptionItemPriceAmount &&
                price.get('type') === stripeSubscriptionItemPriceType &&
                price.get('interval') === stripeSubscriptionItemPriceInterval;
        });

        let stripePriceId;
        let isNewStripePrice = false;

        if (!ghostProductPrice) {
            // If there is not a matching price, create one on the associated Stripe product using the existing
            // subscription item price details and update the stripe subscription to use it
            const stripeProduct = ghostProduct.related('stripeProducts').first();

            const newStripePrice = await this._stripeAPIService.createPrice({
                product: stripeProduct.get('stripe_product_id'),
                active: true,
                nickname: stripeSubscriptionItemPriceInterval === 'month' ? 'Monthly' : 'Yearly',
                currency: stripeSubscriptionItemPriceCurrency,
                amount: stripeSubscriptionItemPriceAmount,
                type: stripeSubscriptionItemPriceType,
                interval: stripeSubscriptionItemPriceInterval
            });

            await this._stripeAPIService.updateSubscriptionItemPrice(
                stripeSubscription.id,
                stripeSubscriptionItem.id,
                newStripePrice.id
            );

            stripePriceId = newStripePrice.id;
            isNewStripePrice = true;
        } else {
            // If there is a matching price, and the subscription is not already using it,
            // update the subscription to use it
            stripePriceId = ghostProductPrice.get('stripe_price_id');

            if (stripeSubscriptionItem.price.id !== stripePriceId) {
                await this._stripeAPIService.updateSubscriptionItemPrice(
                    stripeSubscription.id,
                    stripeSubscriptionItem.id,
                    stripePriceId
                );
            }
        }

        // If there is a matching price, and the subscription is already using it, nothing else needs to be done

        return {
            stripePriceId,
            isNewStripePrice
        };
    }

    /**
     * Archive a price in Stripe
     *
     * @param {Number} stripePriceId
     * @returns {Promise<void>}
     */
    async archivePrice(stripePriceId) {
        await this._stripeAPIService.updatePrice(stripePriceId, {active: false});
    }
};
