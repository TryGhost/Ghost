/**
 * @typedef {object} ProductModel
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
     *
     * @param {object} options
     *
     * @returns {Promise<ProductModel>}
     **/
    async create(data, options) {
        const productData = {
            name: data.name
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

            await product.related('stripeProducts').fetch(options);
        }

        return product;
    }

    /**
     * Updates a product by id
     *
     * @param {object} data
     * @param {string} data.id
     * @param {string} data.name
     *
     * @param {object} data.stripe_price
     * @param {string} data.stripe_price.nickname
     * @param {string} data.stripe_price.currency
     * @param {number} data.stripe_price.amount
     * @param {'recurring'|'one-time'} data.stripe_price.type
     * @param {string | null} data.stripe_price.interval
     * @param {string?} data.stripe_price.stripe_product_id
     *
     * @param {object} options
     *
     * @returns {Promise<ProductModel>}
     **/
    async update(data, options) {
        const productData = {
            name: data.name
        };

        const product = await this._Product.edit(productData, {
            ...options,
            id: data.id
        });

        if (this._stripeAPIService.configured && data.stripe_price) {
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
            const productId = data.stripe_price.stripe_product_id;
            const stripeProduct = productId ?
                await this._StripeProduct.findOne({stripe_product_id: productId}, options) : defaultStripeProduct;

            const price = await this._stripeAPIService.createPrice({
                product: defaultStripeProduct.stripe_product_id,
                active: true,
                nickname: data.stripe_price.nickname,
                currency: data.stripe_price.currency,
                amount: data.stripe_price.amount,
                type: data.stripe_price.type,
                interval: data.stripe_price.interval
            });

            await this._StripePrice.add({
                stripe_price_id: price.id,
                stripe_product_id: stripeProduct.stripe_product_id
            }, options);

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
