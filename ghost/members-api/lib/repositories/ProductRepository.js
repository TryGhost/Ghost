const {UpdateCollisionError, NotFoundError, MethodNotAllowedError, ValidationError, BadRequestError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    priceMustBeInteger: 'Tier prices must be an integer.',
    priceIsNegative: 'Tier prices must not be negative',
    maxPriceExceeded: 'Tier prices may not exceed 999999.99'
};

/**
 * @typedef {object} ProductModel
 */

/**
 * @typedef {object} StripePriceInput
 * @param {string} nickname
 * @param {string} currency
 * @param {number} amount
 * @param {'recurring'|'one-time'} type
 * @param {string | null} interval
 * @param {string?} stripe_product_id
 * @param {string?} stripe_price_id
 */

/**
 * @typedef {object} BenefitInput
 * @param {string} name
 */

function validatePrice(price) {
    if (!Number.isInteger(price.amount)) {
        throw new ValidationError({
            message: tpl(messages.priceMustBeInteger)
        });
    }

    if (price.amount < 0) {
        throw new ValidationError({
            message: tpl(messages.priceIsNegative)
        });
    }

    if (price.amount > 9999999999) {
        throw new ValidationError({
            message: tpl(messages.maxPriceExceeded)
        });
    }
}

class ProductRepository {
    /**
     * @param {object} deps
     * @param {any} deps.Product
     * @param {any} deps.Settings
     * @param {any} deps.StripeProduct
     * @param {any} deps.StripePrice
     * @param {import('@tryghost/members-api/lib/services/stripe-api')} deps.stripeAPIService
     */
    constructor({
        Product,
        Settings,
        StripeProduct,
        StripePrice,
        stripeAPIService
    }) {
        this._Product = Product;
        this._Settings = Settings;
        this._StripeProduct = StripeProduct;
        this._StripePrice = StripePrice;
        this._stripeAPIService = stripeAPIService;
    }

    /**
     * Retrieves a Product by either stripe_product_id, stripe_price_id, id or slug
     *
     * @param {{stripe_product_id: string} | {stripe_price_id: string} | {id: string} | {slug: string}} data
     * @param {object} options
     *
     * @returns {Promise<ProductModel>}
     */
    async get(data, options = {}) {
        if (!options.transacting) {
            return this._Product.transaction((transacting) => {
                return this.get(data, {
                    ...options,
                    transacting
                });
            });
        }
        if ('stripe_product_id' in data) {
            const stripeProduct = await this._StripeProduct.findOne({
                stripe_product_id: data.stripe_product_id
            }, options);

            if (!stripeProduct) {
                return null;
            }

            return await stripeProduct.related('product').fetch(options);
        }

        if ('stripe_price_id' in data) {
            const stripePrice = await this._StripePrice.findOne({
                stripe_price_id: data.stripe_price_id
            }, options);

            if (!stripePrice) {
                return null;
            }

            const stripeProduct = await stripePrice.related('stripeProduct').fetch(options);

            if (!stripeProduct) {
                return null;
            }

            return await stripeProduct.related('product').fetch(options);
        }

        if ('id' in data) {
            return await this._Product.findOne({id: data.id}, options);
        }

        if ('slug' in data) {
            return await this._Product.findOne({slug: data.slug}, options);
        }

        throw new NotFoundError({message: 'Missing id, slug, stripe_product_id or stripe_price_id from data'});
    }

    /**
     * Fetches the default product
     * @param {Object} options
     * @returns {Promise<ProductModel>}
     */
    async getDefaultProduct(options = {}) {
        const defaultProductPage = await this.list({
            filter: 'type:paid+active:true',
            limit: 1,
            ...options
        });

        return defaultProductPage.data[0];
    }

    /**
     * Creates a product from a name
     *
     * @param {object} data
     * @param {string} data.name
     * @param {string} data.description
     * @param {'public'|'none'} data.visibility
     * @param {string} data.welcome_page_url
     * @param {BenefitInput[]} data.benefits
     * @param {StripePriceInput[]} data.stripe_prices
     * @param {StripePriceInput|null} data.monthly_price
     * @param {StripePriceInput|null} data.yearly_price
     * @param {string} data.product_id
     * @param {string} data.stripe_product_id
     * @param {number} data.trial_days
     *
     * @param {object} options
     *
     * @returns {Promise<ProductModel>}
     **/
    async create(data, options = {}) {
        if (!this._stripeAPIService.configured && (data.stripe_prices || data.monthly_price || data.yearly_price)) {
            throw new UpdateCollisionError({
                message: 'The requested functionality requires Stripe to be configured. See https://ghost.org/integrations/stripe/',
                code: 'STRIPE_NOT_CONFIGURED'
            });
        }

        if (!options.transacting) {
            return this._Product.transaction((transacting) => {
                return this.create(data, {
                    ...options,
                    transacting
                });
            });
        }

        if (data.monthly_price) {
            validatePrice(data.monthly_price);
        }

        if (data.yearly_price) {
            validatePrice(data.monthly_price);
        }

        if (data.yearly_price && data.monthly_price && data.yearly_price.currency !== data.monthly_price.currency) {
            throw new BadRequestError({
                message: 'The monthly and yearly price must use the same currency'
            });
        }

        if (data.stripe_prices) {
            data.stripe_prices.forEach(validatePrice);
        }

        const productData = {
            type: 'paid',
            active: true,
            visibility: data.visibility,
            name: data.name,
            description: data.description,
            benefits: data.benefits,
            welcome_page_url: data.welcome_page_url
        };

        if (data.monthly_price) {
            productData.monthly_price = data.monthly_price.amount;
            productData.currency = data.monthly_price.currency;
        }

        if (data.yearly_price) {
            productData.yearly_price = data.yearly_price.amount;
            productData.currency = data.yearly_price.currency;
        }

        if (Reflect.has(data, 'trial_days')) {
            productData.trial_days = data.trial_days;
        }

        const product = await this._Product.add(productData, options);

        if (this._stripeAPIService.configured) {
            const stripeProduct = await this._stripeAPIService.createProduct({
                name: productData.name
            });

            await this._StripeProduct.add({
                product_id: product.id,
                stripe_product_id: stripeProduct.id
            }, options);

            if (data.monthly_price || data.yearly_price) {
                if (data.monthly_price) {
                    const price = await this._stripeAPIService.createPrice({
                        product: stripeProduct.id,
                        active: true,
                        nickname: `Monthly`,
                        currency: data.monthly_price.currency,
                        amount: data.monthly_price.amount,
                        type: 'recurring',
                        interval: 'month'
                    });

                    const stripePrice = await this._StripePrice.add({
                        stripe_price_id: price.id,
                        stripe_product_id: stripeProduct.id,
                        active: true,
                        nickname: price.nickname,
                        currency: price.currency,
                        amount: price.unit_amount,
                        type: 'recurring',
                        interval: 'month'
                    }, options);

                    await this._Product.edit({monthly_price_id: stripePrice.id}, {id: product.id, transacting: options.transacting});
                }

                if (data.yearly_price) {
                    const price = await this._stripeAPIService.createPrice({
                        product: stripeProduct.id,
                        active: true,
                        nickname: `Yearly`,
                        currency: data.yearly_price.currency,
                        amount: data.yearly_price.amount,
                        type: 'recurring',
                        interval: 'year'
                    });

                    const stripePrice = await this._StripePrice.add({
                        stripe_price_id: price.id,
                        stripe_product_id: stripeProduct.id,
                        active: true,
                        nickname: price.nickname,
                        currency: price.currency,
                        amount: price.unit_amount,
                        type: 'recurring',
                        interval: 'year'
                    }, options);

                    await this._Product.edit({yearly_price_id: stripePrice.id}, {id: product.id, transacting: options.transacting});
                }
            } else if (data.stripe_prices) {
                for (const newPrice of data.stripe_prices) {
                    const price = await this._stripeAPIService.createPrice({
                        product: stripeProduct.id,
                        active: true,
                        nickname: newPrice.nickname,
                        currency: newPrice.currency,
                        amount: newPrice.amount,
                        type: newPrice.type,
                        interval: newPrice.interval
                    });

                    await this._StripePrice.add({
                        stripe_price_id: price.id,
                        stripe_product_id: stripeProduct.id,
                        active: true,
                        nickname: newPrice.nickname,
                        currency: newPrice.currency,
                        amount: newPrice.amount,
                        type: newPrice.type,
                        interval: newPrice.interval
                    }, options);
                }
            }

            await product.related('stripePrices').fetch(options);
            await product.related('monthlyPrice').fetch(options);
            await product.related('yearlyPrice').fetch(options);
        }

        return product;
    }

    /**
     * Updates a product by id
     *
     * @param {object} data
     * @param {string} data.id
     * @param {string} data.name
     * @param {string} data.description
     * @param {number} data.trial_days
     * @param {'public'|'none'} data.visibility
     * @param {string} data.welcome_page_url
     * @param {BenefitInput[]} data.benefits
     *
     * @param {StripePriceInput[]} [data.stripe_prices]
     * @param {StripePriceInput|null} data.monthly_price
     * @param {StripePriceInput|null} data.yearly_price
     *
     * @param {object} options
     *
     * @returns {Promise<ProductModel>}
     **/
    async update(data, options = {}) {
        if (!this._stripeAPIService.configured && (data.stripe_prices || data.monthly_price || data.yearly_price)) {
            throw new UpdateCollisionError({
                message: 'The requested functionality requires Stripe to be configured. See https://ghost.org/integrations/stripe/',
                code: 'STRIPE_NOT_CONFIGURED'
            });
        }

        if (!options.transacting) {
            return this._Product.transaction((transacting) => {
                return this.update(data, {
                    ...options,
                    transacting
                });
            });
        }

        if (data.monthly_price) {
            validatePrice(data.monthly_price);
        }

        if (data.yearly_price) {
            validatePrice(data.monthly_price);
        }

        if (data.stripe_prices) {
            data.stripe_prices.forEach(validatePrice);
        }

        if (data.yearly_price && data.monthly_price && data.yearly_price.currency !== data.monthly_price.currency) {
            throw new BadRequestError({
                message: 'The monthly and yearly price must use the same currency'
            });
        }

        const productId = data.id || options.id;

        const existingProduct = await this._Product.findOne({id: productId}, options);

        let productData = {
            name: data.name,
            visibility: data.visibility,
            description: data.description,
            benefits: data.benefits,
            welcome_page_url: data.welcome_page_url
        };

        if (data.monthly_price) {
            productData.monthly_price = data.monthly_price.amount;
            productData.currency = data.monthly_price.currency;
        }

        if (data.yearly_price) {
            productData.yearly_price = data.yearly_price.amount;
            productData.currency = data.yearly_price.currency;
        }

        if (Reflect.has(data, 'active')) {
            productData.active = data.active;
        }

        if (Reflect.has(data, 'trial_days')) {
            productData.trial_days = data.trial_days;
        }

        if (existingProduct.get('type') === 'free') {
            delete productData.name;
            delete productData.active;
            delete productData.trial_days;
        }

        if (existingProduct.get('active') === true && productData.active === false) {
            const portalProductsSetting = await this._Settings.findOne({
                key: 'portal_products'
            }, options);

            let portalProducts;
            try {
                portalProducts = JSON.parse(portalProductsSetting.get('value'));
            } catch (err) {
                portalProducts = [];
            }

            const updatedProducts = portalProducts.filter(product => product !== productId);

            await this._Settings.edit({
                key: 'portal_products',
                value: JSON.stringify(updatedProducts)
            }, {
                ...options,
                id: portalProductsSetting.get('id')
            });
        }

        let product = await this._Product.edit(productData, {
            ...options,
            id: productId
        });

        if (this._stripeAPIService.configured && product.get('type') !== 'free') {
            await product.related('stripeProducts').fetch(options);

            if (!product.related('stripeProducts').first()) {
                const stripeProduct = await this._stripeAPIService.createProduct({
                    name: product.get('name')
                });

                await this._StripeProduct.add({
                    product_id: product.id,
                    stripe_product_id: stripeProduct.id
                }, options);

                await product.related('stripeProducts').fetch(options);
            } else {
                if (product.attributes.name !== product._previousAttributes.name) {
                    const stripeProduct = product.related('stripeProducts').first();
                    await this._stripeAPIService.updateProduct(stripeProduct.get('stripe_product_id'), {
                        name: product.get('name')
                    });
                }
            }

            const defaultStripeProduct = product.related('stripeProducts').first();

            if (data.monthly_price || data.yearly_price) {
                if (data.monthly_price) {
                    const existingPrice = await this._StripePrice.findOne({
                        stripe_product_id: defaultStripeProduct.get('stripe_product_id'),
                        amount: data.monthly_price.amount,
                        currency: data.monthly_price.currency,
                        type: 'recurring',
                        interval: 'month',
                        active: true
                    }, options);
                    let priceModel;
                    if (existingPrice) {
                        priceModel = existingPrice;

                        await this._stripeAPIService.updatePrice(priceModel.get('stripe_price_id'), {
                            active: true
                        });

                        await this._StripePrice.edit({
                            active: true
                        }, {...options, id: priceModel.id});
                    } else {
                        const price = await this._stripeAPIService.createPrice({
                            product: defaultStripeProduct.get('stripe_product_id'),
                            active: true,
                            nickname: `Monthly`,
                            currency: data.monthly_price.currency,
                            amount: data.monthly_price.amount,
                            type: 'recurring',
                            interval: 'month'
                        });

                        const stripePrice = await this._StripePrice.add({
                            stripe_price_id: price.id,
                            stripe_product_id: defaultStripeProduct.get('stripe_product_id'),
                            active: true,
                            nickname: price.nickname,
                            currency: price.currency,
                            amount: price.unit_amount,
                            type: 'recurring',
                            interval: 'month'
                        }, options);

                        priceModel = stripePrice;
                    }

                    product = await this._Product.edit({monthly_price_id: priceModel.id}, {...options, id: product.id});
                }

                if (data.yearly_price) {
                    const existingPrice = await this._StripePrice.findOne({
                        stripe_product_id: defaultStripeProduct.get('stripe_product_id'),
                        amount: data.yearly_price.amount,
                        currency: data.yearly_price.currency,
                        type: 'recurring',
                        interval: 'year',
                        active: true
                    }, options);
                    let priceModel;

                    if (existingPrice) {
                        priceModel = existingPrice;

                        await this._stripeAPIService.updatePrice(priceModel.get('stripe_price_id'), {
                            active: true
                        });

                        await this._StripePrice.edit({
                            active: true
                        }, {...options, id: priceModel.id});
                    } else {
                        const price = await this._stripeAPIService.createPrice({
                            product: defaultStripeProduct.get('stripe_product_id'),
                            active: true,
                            nickname: `Yearly`,
                            currency: data.yearly_price.currency,
                            amount: data.yearly_price.amount,
                            type: 'recurring',
                            interval: 'year'
                        });

                        const stripePrice = await this._StripePrice.add({
                            stripe_price_id: price.id,
                            stripe_product_id: defaultStripeProduct.get('stripe_product_id'),
                            active: true,
                            nickname: price.nickname,
                            currency: price.currency,
                            amount: price.unit_amount,
                            type: 'recurring',
                            interval: 'year'
                        }, options);

                        priceModel = stripePrice;
                    }

                    product = await this._Product.edit({yearly_price_id: priceModel.id}, {...options, id: product.id});
                }
            } else if (data.stripe_prices) {
                const newPrices = data.stripe_prices.filter(price => !price.stripe_price_id);
                const existingPrices = data.stripe_prices.filter((price) => {
                    return !!price.stripe_price_id && !!price.stripe_product_id;
                });

                for (const existingPrice of existingPrices) {
                    const existingProductId = existingPrice.stripe_product_id;
                    let stripeProduct = await this._StripeProduct.findOne({stripe_product_id: existingProductId}, options);
                    if (!stripeProduct) {
                        stripeProduct = await this._StripeProduct.add({
                            product_id: product.id,
                            stripe_product_id: existingProductId
                        }, options);
                    }
                    const stripePrice = await this._StripePrice.findOne({stripe_price_id: existingPrice.stripe_price_id}, options);

                    if (!stripePrice) {
                        await this._StripePrice.add({
                            stripe_price_id: existingPrice.stripe_price_id,
                            stripe_product_id: stripeProduct.get('stripe_product_id'),
                            active: existingPrice.active,
                            nickname: existingPrice.nickname,
                            description: existingPrice.description,
                            currency: existingPrice.currency,
                            amount: existingPrice.amount,
                            type: existingPrice.type,
                            interval: existingPrice.interval
                        }, options);
                    } else {
                        const updated = await this._StripePrice.edit({
                            nickname: existingPrice.nickname,
                            description: existingPrice.description,
                            active: existingPrice.active
                        }, {
                            ...options,
                            id: stripePrice.id
                        });

                        await this._stripeAPIService.updatePrice(updated.get('stripe_price_id'), {
                            nickname: updated.get('nickname'),
                            active: updated.get('active')
                        });
                    }
                }

                for (const newPrice of newPrices) {
                    const newProductId = newPrice.stripe_product_id;
                    const stripeProduct = newProductId ?
                        await this._StripeProduct.findOne({stripe_product_id: newProductId}, options) : defaultStripeProduct;

                    const price = await this._stripeAPIService.createPrice({
                        product: stripeProduct.get('stripe_product_id'),
                        active: true,
                        nickname: newPrice.nickname,
                        currency: newPrice.currency,
                        amount: newPrice.amount,
                        type: newPrice.type,
                        interval: newPrice.interval
                    });

                    await this._StripePrice.add({
                        stripe_price_id: price.id,
                        stripe_product_id: stripeProduct.get('stripe_product_id'),
                        active: price.active,
                        nickname: price.nickname,
                        description: newPrice.description,
                        currency: price.currency,
                        amount: price.unit_amount,
                        type: price.type,
                        interval: price.recurring && price.recurring.interval || null
                    }, options);
                }
            }

            await product.related('stripePrices').fetch(options);
            await product.related('monthlyPrice').fetch(options);
            await product.related('yearlyPrice').fetch(options);
            await product.related('benefits').fetch(options);
        }

        return product;
    }

    /**
     * Returns a paginated list of Products
     *
     * @params {object} options
     *
     * @returns {Promise<{data: ProductModel[], meta: object}>}
     **/
    async list(options = {}) {
        return this._Product.findPage(options);
    }

    async destroy() {
        throw new MethodNotAllowedError({message: 'Cannot destroy products, yet...'});
    }
}

module.exports = ProductRepository;
