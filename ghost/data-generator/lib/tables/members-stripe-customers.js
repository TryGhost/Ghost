const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class MembersStripeCustomersImporter extends TableImporter {
    constructor(knex) {
        super('members_stripe_customers', knex);
    }

    setImportOptions({model}) {
        this.model = model;
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
