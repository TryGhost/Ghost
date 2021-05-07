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

class ProductRepository {
    /**
     * @param {object} deps
     * @param {any} deps.Product
     * @param {any} deps.StripeProduct
     * @param {any} deps.StripePrice
     * @param {import('@tryghost/members-api/lib/services/stripe-api')} deps.stripeAPIService
     */
    constructor({
        Product,
        StripeProduct,
        StripePrice,
        stripeAPIService
    }) {
        this._Product = Product;
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
    async get(data, options) {
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

        throw new Error('Missing id, slug, stripe_product_id or stripe_price_id from data');
    }

    /**
     * Creates a product from a name
     *
     * @param {object} data
     * @param {string} data.name
     * @param {string} data.description
     * @param {StripePriceInput[]} data.stripe_prices
     * @param {string} data.product_id
     * @param {string} data.stripe_product_id
     *
     * @param {object} options
     *
     * @returns {Promise<ProductModel>}
     **/
    async create(data, options) {
        const productData = {
            name: data.name,
            description: data.description
        };

        const product = await this._Product.add(productData, options);

        if (this._stripeAPIService.configured) {
            const stripeProduct = await this._stripeAPIService.createProduct({
                name: productData.name
            });

            await this._StripeProduct.add({
                product_id: product.id,
                stripe_product_id: stripeProduct.id
            }, options);

            if (data.stripe_prices) {
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
     *
     * @param {StripePriceInput[]=} data.stripe_prices
     *
     * @param {object} options
     *
     * @returns {Promise<ProductModel>}
     **/
    async update(data, options) {
        const productData = {
            name: data.name,
            description: data.description
        };

        const product = await this._Product.edit(productData, {
            ...options,
            id: data.id || options.id
        });

        if (this._stripeAPIService.configured && data.stripe_prices) {
            await product.related('stripeProducts').fetch(options);

            if (!product.related('stripeProducts').first()) {
                const stripeProduct = await this._stripeAPIService.createProduct({
                    name: productData.name
                });

                await this._StripeProduct.add({
                    product_id: product.id,
                    stripe_product_id: stripeProduct.id
                }, options);

                await product.related('stripeProducts').fetch(options);
            }

            const defaultStripeProduct = product.related('stripeProducts').first();

            const newPrices = data.stripe_prices.filter(price => !price.stripe_price_id);
            const existingPrices = data.stripe_prices.filter((price) => {
                return !!price.stripe_price_id && !!price.stripe_product_id;
            });

            for (const existingPrice of existingPrices) {
                const productId = existingPrice.stripe_product_id;
                let stripeProduct = await this._StripeProduct.findOne({stripe_product_id: productId}, options);
                if (!stripeProduct) {
                    stripeProduct = await this._StripeProduct.add({
                        product_id: product.id,
                        stripe_product_id: productId
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
                const productId = newPrice.stripe_product_id;
                const stripeProduct = productId ?
                    await this._StripeProduct.findOne({stripe_product_id: productId}, options) : defaultStripeProduct;

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

            await product.related('stripePrices').fetch(options);
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
    async list(options) {
        return this._Product.findPage(options);
    }

    async destroy() {
        throw new Error('Cannot destroy products, yet...');
    }
}

module.exports = ProductRepository;
