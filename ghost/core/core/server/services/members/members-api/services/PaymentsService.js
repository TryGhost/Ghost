const logging = require('@tryghost/logging');
const DomainEvents = require('@tryghost/domain-events');
const {TierCreatedEvent, TierPriceChangeEvent, TierNameChangeEvent} = require('@tryghost/tiers');
const OfferCreatedEvent = require('@tryghost/members-offers').events.OfferCreatedEvent;
const {BadRequestError} = require('@tryghost/errors');

class PaymentsService {
    /**
     * @param {object} deps
     * @param {import('bookshelf').Model} deps.Offer
     * @param {import('@tryghost/members-offers/lib/application/OffersAPI')} deps.offersAPI
     * @param {import('@tryghost/members-stripe-service/lib/StripeAPI')} deps.stripeAPIService
     * @param {{get(key: string): any}} deps.settingsCache
     */
    constructor(deps) {
        /** @private */
        this.OfferModel = deps.Offer;
        /** @private */
        this.StripeProductModel = deps.StripeProduct;
        /** @private */
        this.StripePriceModel = deps.StripePrice;
        /** @private */
        this.StripeCustomerModel = deps.StripeCustomer;
        /** @private */
        this.offersAPI = deps.offersAPI;
        /** @private */
        this.stripeAPIService = deps.stripeAPIService;
        /** @private */
        this.settingsCache = deps.settingsCache;

        DomainEvents.subscribe(OfferCreatedEvent, async (event) => {
            await this.getCouponForOffer(event.data.offer.id);
        });

        DomainEvents.subscribe(TierCreatedEvent, async (event) => {
            if (event.data.tier.type === 'paid') {
                await this.getPriceForTierCadence(event.data.tier, 'month');
                await this.getPriceForTierCadence(event.data.tier, 'year');
            }
        });

        DomainEvents.subscribe(TierPriceChangeEvent, async (event) => {
            if (event.data.tier.type === 'paid') {
                await this.getPriceForTierCadence(event.data.tier, 'month');
                await this.getPriceForTierCadence(event.data.tier, 'year');
            }
        });

        DomainEvents.subscribe(TierNameChangeEvent, async (event) => {
            if (event.data.tier.type === 'paid') {
                await this.updateNameForTierProducts(event.data.tier);
            }
        });
    }

    /**
     * @param {object} params
     * @param {Tier} params.tier
     * @param {Tier.Cadence} params.cadence
     * @param {Offer} [params.offer]
     * @param {Member} [params.member]
     * @param {Object.<string, any>} [params.metadata]
     * @param {string} params.successUrl
     * @param {string} params.cancelUrl
     * @param {string} [params.email]
     *
     * @returns {Promise<URL>}
     */
    async getPaymentLink({tier, cadence, offer, member, metadata, successUrl, cancelUrl, email}) {
        let coupon = null;
        let trialDays = null;
        if (offer) {
            if (!tier.id.equals(offer.tier.id)) {
                throw new BadRequestError({
                    message: 'This Offer is not valid for the Tier'
                });
            }
            if (offer.type === 'trial') {
                trialDays = offer.amount;
            } else {
                coupon = await this.getCouponForOffer(offer.id);
            }
        }

        let customer = null;
        if (member) {
            customer = await this.getCustomerForMember(member);
        }

        const price = await this.getPriceForTierCadence(tier, cadence);

        const data = {
            metadata,
            successUrl: successUrl,
            cancelUrl: cancelUrl,
            trialDays: trialDays ?? tier.trialDays,
            coupon: coupon?.id
        };

        // If we already have a coupon, we don't want to give trial days over it
        if (data.coupon) {
            delete data.trialDays;
        }

        if (!customer && email) {
            data.customerEmail = email;
        }

        const session = await this.stripeAPIService.createCheckoutSession(price.id, customer, data);

        return session.url;
    }

    /**
     * @param {object} params
     * @param {Member} [params.member]
     * @param {Object.<string, any>} [params.metadata]
     * @param {string} params.successUrl
     * @param {string} params.cancelUrl
     * @param {boolean} [params.isAuthenticated]
     * @param {string} [params.email]
     *
     * @returns {Promise<URL>}
     */
    async getDonationPaymentLink({member, metadata, successUrl, cancelUrl, email, isAuthenticated, personalNote}) {
        let customer = null;
        if (member && isAuthenticated) {
            customer = await this.getCustomerForMember(member);
        }
        
        const data = {
            priceId: (await this.getPriceForDonations()).id,
            metadata,
            successUrl: successUrl,
            cancelUrl: cancelUrl,
            customer,
            customerEmail: !customer && email ? email : null,
            personalNote: personalNote 

        };

        const session = await this.stripeAPIService.createDonationCheckoutSession(data);
        return session.url;
    }

    async getCustomerForMember(member) {
        const rows = await this.StripeCustomerModel.where({
            member_id: member.id
        }).query().select('customer_id');

        for (const row of rows) {
            try {
                const customer = await this.stripeAPIService.getCustomer(row.customer_id);
                if (!customer.deleted) {
                    return customer;
                }
            } catch (err) {
                logging.warn(err);
            }
        }

        const customer = await this.createCustomerForMember(member);

        return customer;
    }

    async createCustomerForMember(member) {
        const customer = await this.stripeAPIService.createCustomer({
            email: member.get('email'),
            name: member.get('name')
        });

        await this.StripeCustomerModel.add({
            member_id: member.id,
            customer_id: customer.id,
            email: customer.email,
            name: customer.name
        });

        return customer;
    }

    /**
     * @param {import('@tryghost/tiers').Tier} tier
     * @returns {Promise<{id: string}>}
     */
    async getProductForTier(tier) {
        const rows = await this.StripeProductModel
            .where({product_id: tier.id.toHexString()})
            .query()
            .select('stripe_product_id');

        for (const row of rows) {
            try {
                const product = await this.stripeAPIService.getProduct(row.stripe_product_id);
                if (product.active) {
                    return {id: product.id};
                }
            } catch (err) {
                logging.warn(err);
            }
        }

        const product = await this.createProductForTier(tier);

        return {
            id: product.id
        };
    }

    /**
     * @param {import('@tryghost/tiers').Tier} tier
     * @returns {Promise<import('stripe').default.Product>}
     */
    async createProductForTier(tier) {
        const product = await this.stripeAPIService.createProduct({name: tier.name});
        await this.StripeProductModel.add({
            product_id: tier.id.toHexString(),
            stripe_product_id: product.id
        });
        return product;
    }

    /**
     * @param {import('@tryghost/tiers').Tier} tier
     * @returns {Promise<void>}
     */
    async updateNameForTierProducts(tier) {
        const rows = await this.StripeProductModel
            .where({product_id: tier.id.toHexString()})
            .query()
            .select('stripe_product_id');

        for (const row of rows) {
            await this.stripeAPIService.updateProduct(row.stripe_product_id, {
                name: tier.name
            });
        }
    }

    /**
     * @returns {Promise<{id: string}>}
     */
    async getProductForDonations({name}) {
        const existingDonationPrices = await this.StripePriceModel
            .where({
                type: 'donation'
            })
            .query()
            .select('stripe_product_id');

        for (const row of existingDonationPrices) {
            const product = await this.StripeProductModel
                .where({
                    stripe_product_id: row.stripe_product_id
                })
                .query()
                .select('stripe_product_id')
                .first();

            if (product) {
                // Check active in Stripe
                try {
                    const stripeProduct = await this.stripeAPIService.getProduct(row.stripe_product_id);
                    if (stripeProduct.active) {
                        return {id: stripeProduct.id};
                    }
                } catch (err) {
                    logging.warn(err);
                }
            }
        }

        const product = await this.createProductForDonations({name});

        return {
            id: product.id
        };
    }

    /**
     * Stripe's nickname field is limited to 250 characters
     * @returns {string}
     */
    getDonationPriceNickname() {
        const nickname = 'Support ' + this.settingsCache.get('title');
        return nickname.substring(0, 250);
    }

    /**
     * @returns {Promise<{id: string}>}
     */
    async getPriceForDonations() {
        const nickname = this.getDonationPriceNickname();
        const currency = this.settingsCache.get('donations_currency');
        const suggestedAmount = this.settingsCache.get('donations_suggested_amount');

        // Stripe requires a minimum charge amount
        // @see https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts
        const amount = suggestedAmount && suggestedAmount >= 100 ? suggestedAmount : 0;

        const price = await this.StripePriceModel
            .where({
                type: 'donation',
                active: true,
                amount,
                currency
            })
            .query()
            .select('stripe_price_id', 'stripe_product_id', 'id', 'nickname')
            .first();

        if (price) {
            if (price.nickname !== nickname) {
                // Rename it in Stripe (in case the publication name changed)
                try {
                    await this.stripeAPIService.updatePrice(price.stripe_price_id, {
                        nickname
                    });

                    // Update product too
                    await this.stripeAPIService.updateProduct(price.stripe_product_id, {
                        name: nickname
                    });

                    await this.StripePriceModel.edit({
                        nickname
                    }, {id: price.id});
                } catch (err) {
                    logging.warn(err);
                }
            }
            return {
                id: price.stripe_price_id
            };
        }

        const newPrice = await this.createPriceForDonations({
            nickname,
            currency,
            amount
        });
        return {
            id: newPrice.id
        };
    }

    /**
     * @returns {Promise<import('stripe').default.Price>}
     */
    async createPriceForDonations({currency, amount, nickname}) {
        const product = await this.getProductForDonations({name: nickname});

        const preset = amount ? amount : undefined;

        // Create the price in Stripe
        const price = await this.stripeAPIService.createPrice({
            currency,
            product: product.id,
            custom_unit_amount: {
                enabled: true,
                preset
            },
            nickname,
            type: 'one-time',
            active: true
        });

        // Save it to the database
        await this.StripePriceModel.add({
            stripe_price_id: price.id,
            stripe_product_id: product.id,
            active: price.active,
            nickname: price.nickname,
            currency: price.currency,
            amount,
            type: 'donation',
            interval: null
        });
        return price;
    }

    /**
     * @returns {Promise<import('stripe').default.Product>}
     */
    async createProductForDonations({name}) {
        const product = await this.stripeAPIService.createProduct({
            name
        });

        await this.StripeProductModel.add({
            product_id: null,
            stripe_product_id: product.id
        });
        return product;
    }

    /**
     * @param {import('@tryghost/tiers').Tier} tier
     * @param {'month'|'year'} cadence
     * @returns {Promise<{id: string}>}
     */
    async getPriceForTierCadence(tier, cadence) {
        const product = await this.getProductForTier(tier);
        const currency = tier.currency.toLowerCase();
        const amount = tier.getPrice(cadence);
        const rows = await this.StripePriceModel.where({
            stripe_product_id: product.id,
            currency,
            interval: cadence,
            amount,
            active: true,
            type: 'recurring'
        }).query().select('id', 'stripe_price_id');

        for (const row of rows) {
            try {
                const price = await this.stripeAPIService.getPrice(row.stripe_price_id);
                if (price.active && price.currency.toLowerCase() === currency && price.unit_amount === amount && price.recurring?.interval === cadence) {
                    return {
                        id: price.id
                    };
                } else {
                    // Update the database model to prevent future Stripe fetches when it is not needed
                    await this.StripePriceModel.edit({
                        active: !!price.active
                    }, {id: row.id});
                }
            } catch (err) {
                logging.error(`Failed to lookup Stripe Price ${row.stripe_price_id}`);
                logging.error(err);
            }
        }

        const price = await this.createPriceForTierCadence(tier, cadence);

        return {
            id: price.id
        };
    }

    /**
     * @param {import('@tryghost/tiers').Tier} tier
     * @param {'month'|'year'} cadence
     * @returns {Promise<import('stripe').default.Price>}
     */
    async createPriceForTierCadence(tier, cadence) {
        const product = await this.getProductForTier(tier);
        const price = await this.stripeAPIService.createPrice({
            product: product.id,
            interval: cadence,
            currency: tier.currency,
            amount: tier.getPrice(cadence),
            nickname: cadence === 'month' ? 'Monthly' : 'Yearly',
            type: 'recurring',
            active: true
        });
        await this.StripePriceModel.add({
            stripe_price_id: price.id,
            stripe_product_id: product.id,
            active: price.active,
            nickname: price.nickname,
            currency: price.currency,
            amount: price.unit_amount,
            type: 'recurring',
            interval: cadence
        });
        return price;
    }

    /**
     * @param {string} offerId
     *
     * @returns {Promise<{id: string}>}
     */
    async getCouponForOffer(offerId) {
        const row = await this.OfferModel.where({id: offerId}).query().select('stripe_coupon_id', 'discount_type').first();
        if (!row || row.discount_type === 'trial') {
            return null;
        }
        if (!row.stripe_coupon_id) {
            const offer = await this.offersAPI.getOffer({id: offerId});
            await this.createCouponForOffer(offer);
            return this.getCouponForOffer(offerId);
        }
        return {
            id: row.stripe_coupon_id
        };
    }

    /**
     * @param {import('@tryghost/members-offers/lib/application/OfferMapper').OfferDTO} offer
     */
    async createCouponForOffer(offer) {
        /** @type {import('stripe').Stripe.CouponCreateParams} */
        const couponData = {
            name: offer.name,
            duration: offer.duration
        };

        if (offer.duration === 'repeating') {
            couponData.duration_in_months = offer.duration_in_months;
        }

        if (offer.type === 'percent') {
            couponData.percent_off = offer.amount;
        } else {
            couponData.amount_off = offer.amount;
            couponData.currency = offer.currency;
        }

        const coupon = await this.stripeAPIService.createCoupon(couponData);

        await this.OfferModel.edit({
            stripe_coupon_id: coupon.id
        }, {
            id: offer.id
        });
    }
}

module.exports = PaymentsService;
