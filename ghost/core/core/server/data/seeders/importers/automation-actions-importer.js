const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class AutomationActionsImporter extends TableImporter {
    static table = 'automation_actions';
    static dependencies = ['automations'];
    defaultQuantity = 2;

    constructor(knex, transaction) {
        super(AutomationActionsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        if (quantity === 0) {
            return;
        }

        const automations = await this.transaction.select('id', 'slug').from('automations');
        const customAutomations = automations.filter(automation => !automation.slug.startsWith('member-welcome-email-'));
        this.automations = customAutomations.length > 0 ? customAutomations : automations;
        if (this.automations.length === 0) {
            return;
        }

        await super.import(quantity);
    }

    generate() {
        const timestamp = dateToDatabaseString(faker.date.recent({days: 365}));

        return {
            id: this.fastFakeObjectId(),
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
            automation_id: faker.helpers.arrayElement(this.automations).id,
            type: 'send_email'
        };
    }
}

module.exports = AutomationActionsImporter;
