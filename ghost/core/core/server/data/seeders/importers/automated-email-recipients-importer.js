const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class AutomatedEmailRecipientsImporter extends TableImporter {
    static table = 'automated_email_recipients';
    static dependencies = ['members', 'welcome_email_automated_emails', 'automation_action_revisions', 'automation_run_steps'];
    defaultQuantity = 100;

    constructor(knex, transaction) {
        super(AutomatedEmailRecipientsImporter.table, knex, transaction);
        this.generatedCount = 0;
    }

    async import(quantity = this.defaultQuantity) {
        if (quantity === 0) {
            return;
        }

        this.members = await this.transaction.select('id', 'uuid', 'email', 'name').from('members');
        this.membersById = new Map(this.members.map(member => [member.id, member]));
        this.automatedEmails = await this.transaction.select('id').from('welcome_email_automated_emails');
        this.automationActionRevisions = await this.transaction.select('id').from('automation_action_revisions');
        this.automationRunSteps = (await this.transaction('automation_run_steps as step')
            .join('automation_runs as run', 'run.id', 'step.automation_run_id')
            .select('step.id', 'step.automation_action_revision_id', 'run.member_id'))
            .filter(step => this.membersById.has(step.member_id));
        if (this.members.length === 0 || (this.automatedEmails.length === 0 && this.automationActionRevisions.length === 0)) {
            return;
        }

        await super.import(quantity);
    }

    generate() {
        let member = faker.helpers.arrayElement(this.members);
        const usesAutomationActionRevision = this.automationActionRevisions.length > 0
            && (this.automatedEmails.length === 0 || this.generatedCount % 2 === 1);
        const usesAutomationRunStep = usesAutomationActionRevision
            && this.automationRunSteps.length > 0
            && this.generatedCount % 4 === 3;
        const automationRunStep = usesAutomationRunStep ? faker.helpers.arrayElement(this.automationRunSteps) : null;
        if (automationRunStep) {
            member = this.membersById.get(automationRunStep.member_id);
        }
        const automationActionRevisionId = automationRunStep?.automation_action_revision_id
            || (usesAutomationActionRevision ? faker.helpers.arrayElement(this.automationActionRevisions).id : null);
        const deliveredAt = faker.date.recent({days: 90});
        const openedAt = faker.datatype.boolean() ? faker.date.between({from: deliveredAt, to: new Date()}) : null;
        const clickedAt = openedAt && faker.datatype.boolean() ? faker.date.between({from: openedAt, to: new Date()}) : null;
        this.generatedCount += 1;

        return {
            id: this.fastFakeObjectId(),
            automated_email_id: usesAutomationActionRevision ? null : faker.helpers.arrayElement(this.automatedEmails).id,
            automation_action_revision_id: automationActionRevisionId,
            automation_run_step_id: automationRunStep?.id || null,
            member_id: member.id,
            member_uuid: member.uuid,
            member_email: member.email,
            member_name: member.name,
            mailgun_message_id: `${faker.string.alphanumeric(31)}@generated.example.com`,
            delivered_at: dateToDatabaseString(deliveredAt),
            opened_at: openedAt ? dateToDatabaseString(openedAt) : null,
            clicked_at: clickedAt ? dateToDatabaseString(clickedAt) : null,
            track_opens: true,
            track_clicks: true,
            created_at: dateToDatabaseString(deliveredAt),
            updated_at: dateToDatabaseString(clickedAt || openedAt || deliveredAt)
        };
    }
}

module.exports = AutomatedEmailRecipientsImporter;
