const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

const EMPTY_LEXICAL = JSON.stringify({
    root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}
});

class WelcomeEmailAutomatedEmailsImporter extends TableImporter {
    static table = 'welcome_email_automated_emails';
    static dependencies = ['automations', 'email_design_settings'];
    defaultQuantity = 2;

    constructor(knex, transaction) {
        super(WelcomeEmailAutomatedEmailsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        if (quantity === 0) {
            return;
        }

        const automations = await this.transaction.select('id', 'slug').from('automations');
        const welcomeEmailAutomations = automations.filter(automation => automation.slug.startsWith('member-welcome-email-'));
        this.automations = welcomeEmailAutomations.length > 0 ? welcomeEmailAutomations : automations;
        this.emailDesignSettings = await this.transaction.select('id').from('email_design_settings');
        if (this.automations.length === 0 || this.emailDesignSettings.length === 0) {
            return;
        }

        await this.importForEach(this.automations, quantity / this.automations.length);
    }

    generate() {
        const timestamp = dateToDatabaseString(faker.date.recent({days: 365}));

        return {
            id: this.fastFakeObjectId(),
            welcome_email_automation_id: this.model.id,
            next_welcome_email_automated_email_id: null,
            delay_days: faker.number.int({min: 0, max: 7}),
            subject: faker.lorem.sentence(),
            lexical: EMPTY_LEXICAL,
            sender_name: 'Generated sender',
            sender_email: 'generated@example.com',
            sender_reply_to: 'generated@example.com',
            email_design_setting_id: faker.helpers.arrayElement(this.emailDesignSettings).id,
            created_at: timestamp,
            updated_at: timestamp
        };
    }
}

module.exports = WelcomeEmailAutomatedEmailsImporter;
