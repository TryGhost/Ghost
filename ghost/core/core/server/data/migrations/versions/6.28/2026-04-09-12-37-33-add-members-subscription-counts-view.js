const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

const VIEW_NAME = 'members_subscription_counts';
const views = require('../../../schema/views');
const viewDef = views.find(v => v.name === VIEW_NAME);

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info(`Creating view: ${VIEW_NAME}`);
        await knex.raw('DROP VIEW IF EXISTS ??', [VIEW_NAME]);
        await knex.raw('CREATE VIEW ?? AS ' + viewDef.body, [VIEW_NAME]);
    },
    async function down(knex) {
        logging.info(`Dropping view: ${VIEW_NAME}`);
        await knex.raw('DROP VIEW IF EXISTS ??', [VIEW_NAME]);
    }
);
