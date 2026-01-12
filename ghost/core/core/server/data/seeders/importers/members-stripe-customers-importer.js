const {faker} = require('@faker-js/faker');
const TableImporter = require('./table-importer');

class MembersStripeCustomersImporter extends TableImporter {
    static table = 'members_stripe_customers';
    static dependencies = ['members'];

    constructor(knex, transaction) {
        super(MembersStripeCustomersImporter.table, knex, transaction);
    }

    async import(quantity) {
        if (quantity === 0) {
            return;
        }

        let offset = 0;
        let limit = 100000;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const members = await this.transaction.select('id', 'name', 'email', 'created_at', 'status').from('members').limit(limit).offset(offset);

            if (members.length === 0) {
                break;
            }

            await this.importForEach(members, quantity ? quantity / members.length : 1);
            offset += limit;
        }
    }

    generate() {
        if (this.model.status !== 'paid') {
            // Only 30% of free members should have a stripe customer = have had a subscription in the past or tried to subscribe
            // The number should increase the older the member is

            const daysSinceMemberCreated = Math.floor((new Date() - new Date(this.model.created_at)) / (1000 * 60 * 60 * 24));
            const shouldHaveStripeCustomer = faker.datatype.number({min: 0, max: 100}) < Math.max(Math.min(daysSinceMemberCreated / 60, 15), 2);

            if (!shouldHaveStripeCustomer) {
                return;
            }
        }

        return {
            id: this.fastFakeObjectId(),
            member_id: this.model.id,
            customer_id: `cus_${faker.random.alphaNumeric(14, {
                casing: 'mixed'
            })}`,
            name: this.model.name,
            email: this.model.email,
            created_at: this.model.created_at
        };
    }
}

module.exports = MembersStripeCustomersImporter;
