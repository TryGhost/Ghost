// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const knex = require('knex');
const {
    ProductsImporter,
    StripeProductsImporter,
    StripePricesImporter
} = require('../lib/tables');

const generateEvents = require('../lib/utils/event-generator');

const DataGenerator = require('../index');

const schema = require('../../core/core/server/data/schema');

describe('Data Generator', function () {
    let db;

    beforeEach(async function () {
        db = knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        for (const tableName of Object.keys(schema.tables)) {
            await db.schema.createTable(tableName, function (table) {
                for (const rowName of Object.keys(schema.tables[tableName])) {
                    const row = schema.tables[tableName][rowName];

                    if (rowName === '@@UNIQUE_CONSTRAINTS@@') {
                        for (const constraints of row) {
                            table.unique(constraints);
                        }
                        break;
                    } else if (rowName === '@@INDEXES@@') {
                        for (const indexes of row) {
                            table.index(indexes);
                        }
                        break;
                    }

                    let rowChain = table[row.type.toLowerCase()](rowName);
                    if ('nullable' in row) {
                        if (row.nullable) {
                            rowChain = rowChain.nullable();
                        } else {
                            rowChain = rowChain.notNullable();
                        }
                    }
                    if ('defaultTo' in row) {
                        rowChain = rowChain.defaultTo(row.defaultTo);
                    }
                    if ('references' in row) {
                        const [foreignTable, foreignRow] = row.references.split('.');
                        rowChain = rowChain.references(foreignRow).inTable(foreignTable);
                    }
                    if (row.unique) {
                        table.unique([rowName]);
                    }
                    if (row.primary) {
                        table.primary(rowName);
                    }
                }
            });
        }
    });

    afterEach(async function () {
        await db.destroy();
    });

    it('Can import the whole dataset without error', async function () {
        const dataGenerator = new DataGenerator({
            eventsOnly: false,
            knex: db,
            schema: schema,
            logger: {
                info: () => { },
                ok: () => { }
            },
            modelQuantities: {
                members: 10,
                membersLoginEvents: 5,
                posts: 2
            }
        });
        try {
            return await dataGenerator.importData();
        } catch (err) {
            (false).should.eql(true, err.message);
        }
    });
});

describe('Importer', function () {
    let db;

    beforeEach(async function () {
        db = knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        await db.schema.createTable('products', function (table) {
            table.string('id');
            table.string('name');
            table.string('slug');
            table.string('visibility');
            table.date('created_at');
            table.string('type');
            table.string('description');
            table.string('currency');
            table.integer('monthly_price');
            table.integer('yearly_price');
            table.string('monthly_price_id');
            table.string('yearly_price_id');
        });

        await db.schema.createTable('stripe_products', function (table) {
            table.string('id');
            table.string('product_id');
            table.string('stripe_product_id');
            table.date('created_at');
            table.date('updated_at');
        });

        await db.schema.createTable('stripe_prices', function (table) {
            table.string('id');
            table.string('stripe_price_id');
            table.string('stripe_product_id');
            table.boolean('active');
            table.string('nickname');
            table.string('currency');
            table.integer('amount');
            table.string('type');
            table.string('interval');
            table.string('description');
            table.date('created_at');
            table.date('updated_at');
        });
    });

    afterEach(async function () {
        await db.destroy();
    });

    it('Should import a single item', async function () {
        const productsImporter = new ProductsImporter(db);
        const products = await productsImporter.import({amount: 1, rows: ['name', 'monthly_price', 'yearly_price']});

        products.length.should.eql(1);
        products[0].name.should.eql('Free');

        const results = await db.select('id', 'name').from('products');

        results.length.should.eql(1);
        results[0].name.should.eql('Free');
    });

    it('Should import an item for each entry in an array', async function () {
        const productsImporter = new ProductsImporter(db);
        const products = await productsImporter.import({amount: 4, rows: ['name', 'monthly_price', 'yearly_price']});

        const stripeProductsImporter = new StripeProductsImporter(db);
        await stripeProductsImporter.importForEach(products, {
            amount: 1,
            rows: ['product_id', 'stripe_product_id']
        });

        const results = await db.select('id').from('stripe_products');

        results.length.should.eql(4);
    });

    it('Should update products to reference price ids', async function () {
        const productsImporter = new ProductsImporter(db);
        const products = await productsImporter.import({amount: 4, rows: ['name', 'monthly_price', 'yearly_price']});

        const stripeProductsImporter = new StripeProductsImporter(db);
        const stripeProducts = await stripeProductsImporter.importForEach(products, {
            amount: 1,
            rows: ['product_id', 'stripe_product_id']
        });

        const stripePricesImporter = new StripePricesImporter(db, {products});
        const stripePrices = await stripePricesImporter.importForEach(stripeProducts, {
            amount: 2,
            rows: ['stripe_price_id', 'interval', 'stripe_product_id', 'currency', 'amount', 'nickname']
        });

        await productsImporter.addStripePrices({
            products,
            stripeProducts,
            stripePrices
        });

        const results = await db.select('id', 'name', 'monthly_price_id', 'yearly_price_id').from('products');

        results.length.should.eql(4);
        results[0].name.should.eql('Free');
    });
});

describe('Events Generator', function () {
    it('Generates a set of timestamps which meet the criteria', function () {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);
        const endTime = new Date();
        const timestamps = generateEvents({
            shape: 'flat',
            total: 100,
            trend: 'positive',
            startTime,
            endTime
        });

        for (const timestamp of timestamps) {
            timestamp.valueOf().should.be.lessThanOrEqual(endTime.valueOf());
            timestamp.valueOf().should.be.greaterThanOrEqual(startTime.valueOf());
        }
    });

    it('Works for a set of shapes', function () {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);
        const endTime = new Date();

        const options = {
            startTime,
            endTime,
            total: 100,
            trend: 'positive'
        };

        const shapes = ['linear', 'flat', 'ease-in', 'ease-out'];

        for (const shape of shapes) {
            try {
                generateEvents(Object.assign({}, options, {shape}));
            } catch (err) {
                (false).should.eql(true, err.message);
            }
        }
    });
});
