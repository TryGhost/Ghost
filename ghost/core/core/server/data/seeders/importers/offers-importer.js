const TableImporter = require('./table-importer');
const {slugify} = require('@tryghost/string');
const {blogStartDate} = require('../utils/blog-info');
const dateToDatabaseString = require('../utils/database-date');

const offerTemplates = [{
    name: 'Black Friday',
    type: 'percent',
    duration: 'once',
    description: 'Get 20% off for Black Friday',
    amount: () => 20
}, {
    name: 'Free Trial',
    type: 'trial',
    duration: 'trial',
    description: 'Get a 1 week free trial',
    amount: () => 7,
    interval: 'month'
}, {
    name: 'Holiday Sale',
    type: 'amount',
    duration: 'once',
    description: 'Save a fixed amount on your next invoice',
    amount: ({baseAmount}) => Math.max(100, Math.floor(baseAmount * 0.15))
}, {
    name: 'Annual Upgrade',
    type: 'percent',
    duration: 'once',
    description: 'Save 25% on your annual subscription',
    amount: () => 25,
    interval: 'year'
}, {
    name: 'Spring Sale',
    type: 'percent',
    duration: 'once',
    description: '20% off for a limited-time promotion',
    amount: () => 20
}, {
    name: 'Member Special',
    type: 'percent',
    duration: 'repeating',
    description: '100% off for the first month',
    amount: () => 100,
    durationInMonths: () => 1,
    interval: 'month'
}];

class OffersImporter extends TableImporter {
    static table = 'offers';
    static dependencies = ['products'];
    defaultQuantity = 2;

    constructor(knex, transaction) {
        super(OffersImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        this.products = await this.transaction.select('id', 'currency', 'monthly_price', 'yearly_price').from('products').where('type', 'paid');
        this.count = 0;

        await super.import(quantity);
    }

    generate() {
        const templateIndex = this.count % offerTemplates.length;
        const cycle = Math.floor(this.count / offerTemplates.length) + 1;
        const template = offerTemplates[templateIndex];
        const product = this.products[this.count % this.products.length];
        const interval = template.interval || (this.count % 2 === 0 ? 'month' : 'year');
        const baseAmount = interval === 'year' ? product.yearly_price : product.monthly_price;
        const name = cycle === 1 ? template.name : `${template.name} ${cycle}`;
        const id = this.fastFakeObjectId();

        this.count += 1;

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
        // redemption_type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'signup', validations: {isIn: [['signup', 'retention']]}},
        // created_at: {type: 'dateTime', nullable: false},
        // updated_at: {type: 'dateTime', nullable: true}
        return {
            id,
            active: true,
            name,
            code: slugify(cycle === 1 ? template.name : `${template.name}-${cycle}`),
            product_id: product.id,
            stripe_coupon_id: template.type === 'trial' ? null : `cpn_${id}`,
            interval,
            currency: product.currency,
            discount_type: template.type,
            discount_amount: template.amount({baseAmount, cycle}),
            duration: template.duration,
            duration_in_months: template.durationInMonths ? template.durationInMonths({cycle}) : null,
            portal_title: name,
            portal_description: template.description,
            redemption_type: 'signup',
            created_at: dateToDatabaseString(blogStartDate),
            updated_at: dateToDatabaseString(blogStartDate)
        };
    }
}

module.exports = OffersImporter;
