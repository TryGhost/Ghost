const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class AutomationRunStepsImporter extends TableImporter {
    static table = 'automation_run_steps';
    static dependencies = ['automation_runs', 'automation_action_revisions'];

    constructor(knex, transaction) {
        super(AutomationRunStepsImporter.table, knex, transaction);
    }

    async import(quantity) {
        if (quantity === 0) {
            return;
        }

        this.revisions = await this.transaction('automation_action_revisions as revision')
            .join('automation_actions as action', 'action.id', 'revision.action_id')
            .select('revision.id', 'action.automation_id');
        const runs = await this.transaction.select('id', 'automation_id', 'created_at').from('automation_runs');
        if (runs.length === 0 || this.revisions.length === 0) {
            return;
        }

        await this.importForEach(runs, quantity ? quantity / runs.length : 1);
    }

    generate() {
        const matchingRevisions = this.revisions.filter(revision => revision.automation_id === this.model.automation_id);
        if (matchingRevisions.length === 0) {
            return null;
        }

        const readyAt = dateToDatabaseString.parse(this.model.created_at);
        const startedAt = faker.date.between({from: readyAt, to: new Date()});
        const finishedAt = faker.date.between({from: startedAt, to: new Date()});

        return {
            id: this.fastFakeObjectId(),
            created_at: dateToDatabaseString(readyAt),
            updated_at: dateToDatabaseString(finishedAt),
            automation_run_id: this.model.id,
            automation_action_revision_id: faker.helpers.arrayElement(matchingRevisions).id,
            ready_at: dateToDatabaseString(readyAt),
            step_attempts: 1,
            started_at: dateToDatabaseString(startedAt),
            finished_at: dateToDatabaseString(finishedAt),
            status: 'finished',
            locked_by: null,
            locked_at: null
        };
    }
}

module.exports = AutomationRunStepsImporter;
