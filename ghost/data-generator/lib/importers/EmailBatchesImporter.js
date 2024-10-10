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
        const emails = await this.transaction.select('id', 'created_at', 'email_count').from('emails');

        // 1 batch per 1000 recipients
        await this.importForEach(emails, quantity ?? (() => {
            return Math.ceil(this.model.email_count / 1000);
        }));
    }

    generate() {
        const emailSentDate = new Date(this.model.created_at);
        const latestUpdatedDate = new Date(this.model.created_at);
        latestUpdatedDate.setHours(latestUpdatedDate.getHours() + 1);

        return {
            id: this.fastFakeObjectId(),
            email_id: this.model.id,
            provider_id: `${new Date().toISOString().split('.')[0].replace(/[^0-9]/g, '')}.${faker.datatype.hexadecimal({length: 16, prefix: '', case: 'lower'})}@m.example.com`,
            status: 'submitted', // TODO: introduce failures
            created_at: this.model.created_at,
            updated_at: dateToDatabaseString(faker.date.between(emailSentDate, latestUpdatedDate))
        };
    }
}

module.exports = EmailBatchesImporter;
