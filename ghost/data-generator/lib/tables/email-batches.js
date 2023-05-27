const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class EmailBatchesImporter extends TableImporter {
    static table = 'email_batches';

    constructor(knex) {
        super(EmailBatchesImporter.table, knex);
    }

    setImportOptions({model}) {
        this.model = model;
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
