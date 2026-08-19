import type {Stripe} from 'stripe';

const {DataImportError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

type ImportOptions = Record<string, unknown>;

interface StripeSubscriptionItem {
    id: string;
    price: Pick<Stripe.Price, 'id' | 'currency' | 'unit_amount' | 'type' | 'recurring'>;
}

interface StripeCustomer {
    subscriptions: {
        data: Array<{
            id: string;
            items: {
                data: StripeSubscriptionItem[];
            };
        }>;
    };
}

interface StripeAPIService {
    configured: boolean;
    getCustomer(customerId: string): Promise<StripeCustomer | null>;
    createPrice(options: {
        product: string;
        active: true;
        nickname: 'Monthly' | 'Yearly';
        currency: string;
        amount: number | null;
        type: Stripe.Price.Type;
        interval: Stripe.Price.Recurring.Interval;
    }): Promise<{id: string}>;
    updateSubscriptionItemPrice(
        subscriptionId: string,
        subscriptionItemId: string,
        priceId: string,
        options: {prorationBehavior: 'none'}
    ): Promise<unknown>;
    updatePrice(priceId: string, options: {active: false}): Promise<unknown>;
}

interface StripePriceModel {
    get(key: 'currency'): string;
    get(key: 'amount'): number | null;
    get(key: 'type'): Stripe.Price.Type;
    get(key: 'interval'): Stripe.Price.Recurring.Interval | null;
    get(key: 'stripe_price_id'): string;
}

interface StripeProductModel {
    get(key: 'stripe_product_id'): string;
}

interface GhostProductModel<TStripeProduct extends StripeProductModel | null = StripeProductModel | null> {
    get(key: 'name' | 'currency'): string;
    get(key: 'monthly_price' | 'yearly_price'): number;
    related(name: 'stripePrices'): {
        find(predicate: (price: StripePriceModel) => boolean): StripePriceModel | undefined;
    };
    related(name: 'stripeProducts'): {
        first(): TStripeProduct;
    };
}

type GhostProductWithStripeProduct = GhostProductModel<StripeProductModel>;

interface ProductRepository {
    get(data: {id: string}, options: ImportOptions & {withRelated: string[]}): Promise<GhostProductModel | null>;
    update(data: {
        id: string;
        name: string;
        monthly_price: {amount: number; currency: string};
        yearly_price: {amount: number; currency: string};
    }, options: ImportOptions): Promise<GhostProductWithStripeProduct>;
}

interface MembersCSVImporterStripeUtilsDeps {
    stripeAPIService: StripeAPIService;
    productRepository: ProductRepository;
}

interface ForceSubscriptionData {
    customer_id: string;
    product_id: string;
}

function getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }

    return String(error);
}

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
    private readonly _stripeAPIService: StripeAPIService;
    private readonly _productRepository: ProductRepository;

    constructor({
        stripeAPIService,
        productRepository
    }: MembersCSVImporterStripeUtilsDeps) {
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
     */
    async forceStripeSubscriptionToProduct(data: ForceSubscriptionData, options: ImportOptions): Promise<{stripePriceId: string; isNewStripePrice: boolean}> {
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
        let stripeProduct = ghostProduct.related('stripeProducts').first();

        if (!stripeProduct) {
            // Even though we are not updating any information on the product, calling `ProductRepository.update`
            // will ensure that the product gets created in Stripe
            const updatedGhostProduct = await this._productRepository.update({
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
            ghostProduct = updatedGhostProduct;
            stripeProduct = updatedGhostProduct.related('stripeProducts').first();
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
            const newStripePrice = await this._stripeAPIService.createPrice({
                product: stripeProduct.get('stripe_product_id'),
                active: true,
                nickname: stripeSubscriptionItemPriceInterval === 'month' ? 'Monthly' : 'Yearly',
                currency: stripeSubscriptionItemPriceCurrency,
                amount: stripeSubscriptionItemPriceAmount,
                type: stripeSubscriptionItemPriceType,
                interval: stripeSubscriptionItemPriceInterval
            });

            try {
                await this._stripeAPIService.updateSubscriptionItemPrice(
                    stripeSubscription.id,
                    stripeSubscriptionItem.id,
                    newStripePrice.id,
                    {prorationBehavior: 'none'}
                );
            } catch (err) {
                // The subscription update failed after we created a new price, which would
                // otherwise leave the price orphaned on the Stripe product (these accumulate
                // across imports). Archive it, then surface the original error regardless of
                // whether archiving succeeds. Ref: https://github.com/TryGhost/Ghost/issues/22115
                try {
                    await this.archivePrice(newStripePrice.id);
                } catch (archiveErr) {
                    logging.warn(`Failed to archive orphaned Stripe price ${newStripePrice.id} after a failed subscription update: ${getErrorMessage(archiveErr)}`);
                }
                throw err;
            }

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
                    stripePriceId,
                    {prorationBehavior: 'none'}
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
     */
    async archivePrice(stripePriceId: string): Promise<void> {
        await this._stripeAPIService.updatePrice(stripePriceId, {active: false});
    }
};
