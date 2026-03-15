const {faker} = require('@faker-js/faker');
const TableImporter = require('./table-importer');
const dateToDatabaseString = require('../utils/database-date');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');

class MembersStripeCustomersSubscriptionsImporter extends TableImporter {
    static table = 'members_stripe_customers_subscriptions';
    static dependencies = ['members', 'members_products', 'members_stripe_customers', 'products', 'stripe_products', 'stripe_prices'];

    constructor(knex, transaction) {
        super(MembersStripeCustomersSubscriptionsImporter.table, knex, transaction);
    }

    async import() {
        let offset = 0;
        let limit = 5000;
        this.products = await this.transaction.select('id', 'name').from('products').whereNot('type', 'free');
        this.stripeProducts = await this.transaction.select('id', 'product_id', 'stripe_product_id').from('stripe_products');
        this.stripePrices = await this.transaction.select('id', 'nickname', 'stripe_product_id', 'stripe_price_id', 'amount', 'interval', 'currency').from('stripe_prices');

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const membersStripeCustomers = await this.transaction.select('id', 'member_id', 'customer_id').from('members_stripe_customers').limit(limit).offset(offset);

            if (membersStripeCustomers.length === 0) {
                break;
            }

            this.members = await this.transaction.select('id', 'status', 'created_at').from('members').whereIn('id', membersStripeCustomers.map(m => m.member_id));

            if (this.members.length === 0) {
                continue;
            }

            const membersProducts = await this.transaction.select('member_id', 'product_id').from('members_products').whereIn('member_id', this.members.map(member => member.id));
            //const membersStripeCustomers = await this.transaction.select('id', 'member_id', 'customer_id').from('members_stripe_customers').whereIn('member_id', this.members.map(member => member.id));

            this.membersStripeCustomers = new Map();
            for (const customer of membersStripeCustomers) {
                this.membersStripeCustomers.set(customer.member_id, customer);
            }

            this.membersProducts = new Map();

            for (const product of membersProducts) {
                this.membersProducts.set(product.member_id, product);
            }

            await this.importForEach(this.members, 1.2);

            offset += limit;
        }
    }

    setReferencedModel(model) {
        this.model = model;
        this.count = 0;
        this.lastSubscriptionStart = null;
    }

    generate() {
        this.count += 1;

        const member = this.model;
        const customer = this.membersStripeCustomers.get(this.model.id);

        if (!customer) {
            // This is a requirement, so skip if we don't have a customer
            return;
        }

        if (this.count > 1 && member.status !== 'paid') {
            return;
        }

        const memberProduct = this.membersProducts.get(this.model.id);
        let ghostProduct = memberProduct ? this.products.find(product => product.id === memberProduct.product_id) : null;

        // Whether we should create a valid subscription or not
        // We'll only create one valid subscription for each member if they are currently paid
        let createValid = this.count === 1 && member.status === 'paid';

        if (!ghostProduct) {
            // Generate canceled, incomplete, incomplete_expired or unpaid subscriptions
            // Choose a random paid product
            ghostProduct = faker.helpers.arrayElement(this.products);
            createValid = false;
        }

        const isMonthly = luck(70);
        const stripeProduct = this.stripeProducts.find(product => product.product_id === ghostProduct.id);
        const stripePrice = this.stripePrices.find((price) => {
            return price.stripe_product_id === stripeProduct.stripe_product_id &&
                (isMonthly ? price.interval === 'month' : price.interval === 'year');
        });
        const mrr = createValid ? (isMonthly ? stripePrice.amount : Math.floor(stripePrice.amount / 12)) : 0;

        const referenceEndDate = this.lastSubscriptionStart ?? new Date();

        if (!createValid) {
            if (isMonthly) {
                referenceEndDate.setMonth(referenceEndDate.getMonth() - 1);
            } else {
                referenceEndDate.setFullYear(referenceEndDate.getFullYear() - 1);
            }
        }

        if (referenceEndDate < member.created_at) {
            // Not possible to create an invalid subscription here
            return;
        }

        const [startDate] = generateEvents({
            total: 1,
            trend: 'negative',
            startTime: new Date(member.created_at),
            endTime: referenceEndDate,
            shape: 'ease-out'
        });
        this.lastSubscriptionStart = startDate;
        const endDate = new Date(startDate);

        if (createValid) {
            // End date should be in the future

            if (isMonthly) {
                endDate.setFullYear(new Date().getFullYear());
                endDate.setMonth(new Date().getMonth());
                if (endDate < new Date()) {
                    endDate.setMonth(endDate.getMonth() + 1);
                }
            } else {
                endDate.setFullYear(new Date().getFullYear());
                if (endDate < new Date()) {
                    endDate.setFullYear(endDate.getFullYear() + 1);
                }
            }
        } else {
            // End date should be in the past
            if (isMonthly) {
                // What is the month difference between startDate and now? Pick a random number in between
                const monthDiff = (new Date().getFullYear() - startDate.getFullYear()) * 12 + (new Date().getMonth() - startDate.getMonth());
                if (monthDiff === 0) {
                    // Not possible to create an invalid subscription here
                    return;
                }

                const randomMonthDiff = faker.datatype.number({min: 1, max: monthDiff});
                endDate.setMonth(startDate.getMonth() + randomMonthDiff);
            } else {
                // What is the year difference between startDate and now? Pick a random number in between
                const yearDiff = new Date().getFullYear() - startDate.getFullYear();

                if (yearDiff === 0) {
                    // Not possible to create an invalid subscription here
                    return;
                }
                const randomYearDiff = faker.datatype.number({min: 1, max: yearDiff});

                endDate.setFullYear(startDate.getFullYear() + randomYearDiff);
            }
        }

        // Simulate some different statusses here:
        // - active, not ending (cancel_at_period_end  = false)
        // - active, ending (cancel_at_period_end = true)
        // - canceled -> current_period_end can be in both past or present, cancel_at_period_end can be both true or false
        // - incomplete_expired -> user tried to pay but 3D secure expired
        // - incomplete -> waiting on 3D secure
        // - trialing -> need to set trial_end_at to a date in the future
        // - past_due -> last paymet failed, but subscription still active until tried a couple of times
        // - unpaid -> all payment attempts failed - but keep the subscription active (special setting in Stripe)

        const validStatusses = new Array(10).fill({
            status: 'active',
            cancel_at_period_end: false
        });

        // Trialing only possible when the startDate > 1 month ago
        const monthAgo = new Date();

        if (!isMonthly) {
            // Year ago
            monthAgo.setFullYear(monthAgo.getFullYear() - 1);
        } else {
            // Month ago
            monthAgo.setMonth(monthAgo.getMonth() - 1);
        }

        if (startDate > monthAgo) {
            validStatusses.push({
                status: 'trialing',
                cancel_at_period_end: false,
                trial_end_at: dateToDatabaseString(endDate),
                trial_start_at: dateToDatabaseString(startDate)
            });
        }

        // Past due only possible if startDate < 1 month ago
        if (startDate < monthAgo) {
            validStatusses.push({
                status: 'past_due',
                cancel_at_period_end: false
            });
            validStatusses.push({
                status: 'unpaid',
                cancel_at_period_end: false
            });
        }

        const invalidStatusses = [
            {
                status: 'canceled',
                cancel_at_period_end: true
            },
            {
                status: 'canceled',
                cancel_at_period_end: false
            },
            {
                status: 'incomplete_expired',
                cancel_at_period_end: false
            },
            {
                status: 'incomplete',
                cancel_at_period_end: false
            }
        ];

        const status = createValid ? faker.helpers.arrayElement(validStatusses) : faker.helpers.arrayElement(invalidStatusses);

        return {
            id: this.fastFakeObjectId(),
            customer_id: customer.customer_id,
            subscription_id: `sub_${faker.random.alphaNumeric(14)}`,
            stripe_price_id: stripePrice.stripe_price_id,
            start_date: dateToDatabaseString(startDate),
            created_at: dateToDatabaseString(startDate),
            mrr,
            plan_id: stripeProduct.stripe_product_id,
            plan_nickname: `${ghostProduct.name} - ${stripePrice.nickname}`,
            plan_interval: stripePrice.interval,
            plan_amount: stripePrice.amount,
            plan_currency: stripePrice.currency,

            // Defaults
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: dateToDatabaseString(endDate),

            // Override
            ...status
        };
    }
}

module.exports = MembersStripeCustomersSubscriptionsImporter;
