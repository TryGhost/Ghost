const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class EmailBatchesImporter extends TableImporter {
    static table = 'email_batches';
    static dependencies = ['emails'];

    constructor(knex, transaction) {
        super(EmailBatchesImporter.table, knex, transaction);
    }

    async import(quantity) {
        const emails = await this.transaction.select('id', 'created_at').from('emails');

        // TODO: Generate >1 batch per email
        await this.importForEach(emails, quantity ?? emails.length);
    }

    generate() {
        const emailSentDate = new Date(this.model.created_at);
        const latestUpdatedDate = new Date(this.model.created_at);
        latestUpdatedDate.setHours(latestUpdatedDate.getHours() + 1);

        return {
            id: faker.database.mongodbObjectId(),
            email_id: this.model.id,
            provider_id: `${new Date().toISOString().split('.')[0].replace(/[^0-9]/g, '')}.${faker.datatype.hexadecimal({length: 16, prefix: '', case: 'lower'})}@m.example.com`,
            status: 'submitted', // TODO: introduce failures
            created_at: this.model.created_at,
            updated_at: dateToDatabaseString(faker.date.between(emailSentDate, latestUpdatedDate))
        };
    }
}

module.exports = EmailBatchesImporter;
