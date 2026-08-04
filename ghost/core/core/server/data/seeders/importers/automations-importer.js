const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

const DEFAULT_AUTOMATIONS = [{
    name: 'Free member welcome flow',
    slug: 'member-welcome-email-free'
}, {
    name: 'Paid member welcome flow',
    slug: 'member-welcome-email-paid'
}];

class AutomationsImporter extends TableImporter {
    static table = 'automations';
    static dependencies = [];
    defaultQuantity = 3;

    constructor(knex, transaction) {
        super(AutomationsImporter.table, knex, transaction);
        this.generatedCount = 0;
    }

    generate() {
        const id = this.fastFakeObjectId();
        const timestamp = dateToDatabaseString(faker.date.recent({days: 365}));
        const defaultAutomation = DEFAULT_AUTOMATIONS[this.generatedCount];
        this.generatedCount += 1;

        return {
            id,
            status: 'active',
            name: defaultAutomation?.name || `Generated automation ${id}`,
            slug: defaultAutomation?.slug || `generated-automation-${id}`,
            created_at: timestamp,
            updated_at: timestamp
        };
    }
}

module.exports = AutomationsImporter;
