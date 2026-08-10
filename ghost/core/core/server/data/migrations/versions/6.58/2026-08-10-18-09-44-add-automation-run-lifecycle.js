const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addColumn, addIndex, dropColumn, dropIndex} = require('../../../schema/commands');

const TABLE = 'automation_runs';
const STATUS_COLUMN = 'status';
const FINISHED_AT_COLUMN = 'finished_at';
const RUN_STATUSES = [
    'in_progress',
    'completed',
    'automation disabled',
    'failed',
    'member changed status',
    'member unsubscribed'
];
const TERMINAL_STEP_STATUSES = RUN_STATUSES.slice(2);

const statusDefinition = {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'in_progress',
    validations: {isIn: [RUN_STATUSES]}
};

const finishedAtDefinition = {
    type: 'dateTime',
    nullable: true
};

async function addColumnIfMissing(knex, column, definition) {
    if (await knex.schema.hasColumn(TABLE, column)) {
        logging.warn(`Adding column: ${TABLE}.${column} - skipping as column already exists`);
        return;
    }

    await addColumn(TABLE, column, knex, definition, {algorithm: 'auto'});
}

async function dropColumnIfPresent(knex, column, definition) {
    if (!await knex.schema.hasColumn(TABLE, column)) {
        logging.warn(`Removing column: ${TABLE}.${column} - skipping as column does not exist`);
        return;
    }

    await dropColumn(TABLE, column, knex, definition, {algorithm: 'auto'});
}

async function backfillRunStatuses(knex) {
    // These updates intentionally run in order so a run with multiple terminal
    // steps keeps the first matching lifecycle reason.
    // eslint-disable-next-line no-restricted-syntax
    for (const status of TERMINAL_STEP_STATUSES) {
        const updated = await knex(TABLE)
            .where(STATUS_COLUMN, 'in_progress')
            .whereExists(
                knex('automation_run_steps')
                    .select(knex.raw('1'))
                    .whereColumn('automation_run_steps.automation_run_id', `${TABLE}.id`)
                    .where('automation_run_steps.status', status)
            )
            .update({[STATUS_COLUMN]: status});
        logging.info(`Backfilled ${updated} automation run(s) with status "${status}"`);
    }

    const completed = await knex(TABLE)
        .where(STATUS_COLUMN, 'in_progress')
        .whereExists(
            knex('automation_run_steps')
                .select(knex.raw('1'))
                .whereColumn('automation_run_steps.automation_run_id', `${TABLE}.id`)
        )
        .whereNotExists(
            knex('automation_run_steps')
                .select(knex.raw('1'))
                .whereColumn('automation_run_steps.automation_run_id', `${TABLE}.id`)
                .whereNot('automation_run_steps.status', 'finished')
        )
        .update({[STATUS_COLUMN]: 'completed'});
    logging.info(`Backfilled ${completed} completed automation run(s)`);

    const finished = await knex(TABLE)
        .whereNot(STATUS_COLUMN, 'in_progress')
        .whereNull(FINISHED_AT_COLUMN)
        .update({[FINISHED_AT_COLUMN]: knex.raw('??', ['updated_at'])});
    logging.info(`Backfilled finished_at for ${finished} automation run(s)`);
}

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addColumnIfMissing(knex, STATUS_COLUMN, statusDefinition);
        await addColumnIfMissing(knex, FINISHED_AT_COLUMN, finishedAtDefinition);
        await backfillRunStatuses(knex);
        await addIndex(TABLE, ['automation_id', 'created_at'], knex);
        await addIndex(TABLE, ['automation_id', 'status', 'created_at'], knex);
    },
    async function down(knex) {
        await dropIndex(TABLE, ['automation_id', 'status', 'created_at'], knex);
        await dropIndex(TABLE, ['automation_id', 'created_at'], knex);
        await dropColumnIfPresent(knex, FINISHED_AT_COLUMN, finishedAtDefinition);
        await dropColumnIfPresent(knex, STATUS_COLUMN, statusDefinition);
    }
);
