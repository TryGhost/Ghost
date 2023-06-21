const assert = require('assert/strict');
const ProductsImporter = require('../../../../../../../core/server/data/importer/importers/data/ProductsImporter');

const fakeProducts = [{
    id: 'product_1',
    name: 'New One',
    slug: 'new-one',
    active: 1,
    welcome_page_url: null,
    visibility: 'public',
    trial_days: 0,
    description: null,
    type: 'paid',
    created_at: '2022-10-20T11:11:32.000Z',
    updated_at: '2022-10-21T04:47:42.000Z',
    monthly_price_id: 'price_1',
    yearly_price_id: 'price_2'
},{
    id: 'product_2',
    name: 'New One',
    slug: 'new-one',
    active: 1,
    welcome_page_url: null,
    visibility: 'public',
    trial_days: 0,
    description: null,
    type: 'paid',
    created_at: '2022-10-20T11:11:32.000Z',
    updated_at: '2022-10-21T04:47:42.000Z',
    monthly_price_id: 'invalid_price_1',
    yearly_price_id: 'invalid_price_2'
}];

const fakePrices = [{
    id: 'price_1',
    stripe_price_id: 'price_YYYYYYYYYYYYYYYYYYYYYYYY',
    stripe_product_id: 'prod_YYYYYYYYYYYYYY',
    active: 1,
    nickname: 'Monthly',
    currency: 'usd',
    amount: 500,
    type: 'recurring',
    interval: 'month',
    description: null,
    created_at: '2022-10-21T04:57:17.000Z',
    updated_at: '2022-10-21T04:57:17.000Z'
},
{
    id: 'price_2',
    stripe_price_id: 'price_XXXXXXXXXXXXXXXXXXXXXXXX',
    stripe_product_id: 'prod_XXXXXXXXXXXXXX',
    active: 1,
    nickname: 'Yearly',
    currency: 'usd',
    amount: 5000,
    type: 'recurring',
    interval: 'year',
    description: null,
    created_at: '2022-10-27T02:51:28.000Z',
    updated_at: '2022-10-27T02:51:28.000Z'
},
{
    id: 'invalid_price_2',
    stripe_price_id: 'price_XXXXXXXXXXXXXXXXXXXXXXXX',
    stripe_product_id: 'prod_XXXXXXXXXXXXXX',
    active: 1,
    nickname: 'Yearly',
    currency: 'usd',
    amount: 0,
    type: 'recurring',
    interval: 'year',
    description: null,
    created_at: '2022-10-27T02:51:28.000Z',
    updated_at: '2022-10-27T02:51:28.000Z'
},
{
    id: 'invalid_price_2',
    stripe_price_id: 'price_XXXXXXXXXXXXXXXXXXXXXXXX',
    stripe_product_id: 'prod_XXXXXXXXXXXXXX',
    active: 1,
    nickname: 'Yearly',
    currency: 'usd',
    amount: 0,
    type: 'recurring',
    interval: 'year',
    description: null,
    created_at: '2022-10-27T02:51:28.000Z',
    updated_at: '2022-10-27T02:51:28.000Z'
}];

describe('ProductsImporter', function () {
    describe('#beforeImport', function () {
        it('Uses the stripe_prices to populate pricing data', function () {
            const importer = new ProductsImporter({products: fakeProducts, stripe_prices: fakePrices});

            importer.beforeImport();
            assert(importer.dataToImport.length === 1);

            const product = importer.dataToImport[0];

            assert(product.currency === 'usd');
            assert(product.monthly_price === 500);
            assert(product.yearly_price === 5000);
        });

        it('Does not import products with invalid price data', function () {
            const importer = new ProductsImporter({products: fakeProducts, stripe_prices: fakePrices});

            importer.beforeImport();
            assert(importer.dataToImport.length === 1);
        });
    });
});
