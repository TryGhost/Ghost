const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class AutomationRunsImporter extends TableImporter {
    static table = 'automation_runs';
    static dependencies = ['automations', 'members'];
    defaultQuantity = 10;

    constructor(knex, transaction) {
        super(AutomationRunsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        if (quantity === 0) {
            return;
        }

        const automations = await this.transaction.select('id', 'slug').from('automations');
        const customAutomations = automations.filter(automation => !automation.slug.startsWith('member-welcome-email-'));
        this.automations = customAutomations.length > 0 ? customAutomations : automations;
        this.members = await this.transaction.select('id', 'email').from('members');
        if (this.automations.length === 0 || this.members.length === 0) {
            return;
        }

        await super.import(quantity);
    }

    generate() {
        const member = faker.helpers.arrayElement(this.members);
        const timestamp = dateToDatabaseString(faker.date.recent({days: 90}));

        return {
            id: this.fastFakeObjectId(),
            created_at: timestamp,
            updated_at: timestamp,
            automation_id: faker.helpers.arrayElement(this.automations).id,
            member_id: member.id,
            member_email: member.email
        };
    }
}

module.exports = AutomationRunsImporter;
