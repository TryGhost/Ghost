const {createNonTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');
const views = require('../../../schema/views');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Creating members_resolved_subscription view');
        await knex.schema.createViewOrReplace('members_resolved_subscription', function (view) {
            view.as(knex.raw(views.members_resolved_subscription));
        });
    },
    async function down(knex) {
        logging.info('Dropping members_resolved_subscription view');
        await knex.schema.dropViewIfExists('members_resolved_subscription');
    }
);
