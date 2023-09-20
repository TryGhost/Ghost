const {faker} = require('@faker-js/faker');
const TableImporter = require('./TableImporter');

class MembersStripeCustomersImporter extends TableImporter {
    static table = 'members_stripe_customers';
    static dependencies = ['members'];

    constructor(knex, transaction) {
        super(MembersStripeCustomersImporter.table, knex, transaction);
    }

    async import(quantity) {
        const members = await this.transaction.select('id', 'name', 'email', 'created_at').from('members');

        await this.importForEach(members, quantity ? quantity / members.length : 1);
    }

    generate() {
        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.id,
            customer_id: `cus_${faker.random.alphaNumeric(14, {
                casing: 'mixed'
            })}`,
            name: this.model.name,
            email: this.model.email,
            created_at: this.model.created_at,
            created_by: 'unused'
        };
    }
}

module.exports = MembersStripeCustomersImporter;
