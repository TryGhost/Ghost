const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

const EMPTY_LEXICAL = JSON.stringify({
    root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}
});

class AutomationActionRevisionsImporter extends TableImporter {
    static table = 'automation_action_revisions';
    static dependencies = ['automation_actions', 'email_design_settings'];

    constructor(knex, transaction) {
        super(AutomationActionRevisionsImporter.table, knex, transaction);
    }

    async import(quantity) {
        if (quantity === 0) {
            return;
        }

        this.emailDesignSettings = await this.transaction.select('id').from('email_design_settings');
        const actions = await this.transaction.select('id').from('automation_actions');
        if (actions.length === 0 || this.emailDesignSettings.length === 0) {
            return;
        }

        await this.importForEach(actions, quantity ? quantity / actions.length : 1);
    }

    generate() {
        return {
            id: this.fastFakeObjectId(),
            created_at: dateToDatabaseString(faker.date.recent({days: 365})),
            action_id: this.model.id,
            wait_hours: null,
            email_subject: faker.lorem.sentence(),
            email_lexical: EMPTY_LEXICAL,
            email_design_setting_id: faker.helpers.arrayElement(this.emailDesignSettings).id,
            email_sent_count: 0,
            email_opened_count: 0,
            email_clicked_count: 0
        };
    }
}

module.exports = AutomationActionRevisionsImporter;
