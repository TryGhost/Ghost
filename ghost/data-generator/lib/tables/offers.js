const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {blogStartDate} = require('../utils/blog-info');
const dateToDatabaseString = require('../utils/database-date');

class OffersImporter extends TableImporter {
    static table = 'offers';

    constructor(knex, {products}) {
        super(OffersImporter.table, knex);
        this.products = products;
    }

    setImportOptions() {
        this.names = ['Black Friday', 'Free Trial'];
        this.count = 0;
    }

    generate() {
        const name = this.names.shift();

        const product = this.products[faker.datatype.number({
            min: 0,
            max: this.products.length - 1
        })];

        // id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        // // @deprecated: use a status enum with isIn validation, not an `active` boolean
        // active: {type: 'boolean', nullable: false, defaultTo: true},
        // name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        // code: {type: 'string', maxlength: 191, nullable: false, unique: true},
        // product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id'},
        // stripe_coupon_id: {type: 'string', maxlength: 255, nullable: true, unique: true},
        // interval: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['month', 'year']]}},
        // currency: {type: 'string', maxlength: 50, nullable: true},
        // discount_type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['percent', 'amount', 'trial']]}},
        // discount_amount: {type: 'integer', nullable: false},
        // duration: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['trial', 'once', 'repeating', 'forever']]}},
        // duration_in_months: {type: 'integer', nullable: true},
        // portal_title: {type: 'string', maxlength: 191, nullable: true},
        // portal_description: {type: 'string', maxlength: 2000, nullable: true},
        // created_at: {type: 'dateTime', nullable: false},
        // updated_at: {type: 'dateTime', nullable: true}
        return {
            id: faker.database.mongodbObjectId(),
            active: true,
            name,
            code: slugify(name),
            product_id: product.id,
            stripe_coupon_id: faker.random.alphaNumeric(8),
            interval: 'month',
            currency: product.currency,
            discount_type: name === 'Free Trial' ? 'trial' : 'percent',
            discount_amount: name === 'Free Trial' ? 7 : 20,
            duration: name === 'Free Trial' ? 'trial' : 'once',
            duration_in_months: name === 'Free Trial' ? 1 : 12,
            portal_title: name,
            portal_description: name === 'Free Trial' ? 'Get a 1 week free trial' : 'Get 20% off for Black Friday',
            created_at: dateToDatabaseString(blogStartDate),
            updated_at: dateToDatabaseString(blogStartDate)
        };
    }
}

module.exports = OffersImporter;
