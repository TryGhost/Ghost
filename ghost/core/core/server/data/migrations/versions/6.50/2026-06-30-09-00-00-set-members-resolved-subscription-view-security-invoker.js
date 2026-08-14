const {createNonTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');
const commands = require('../../../schema/commands');
const views = require('../../../schema/views');

// The members_resolved_subscription view shipped in 6.45 was created without an
// explicit security context, so MySQL stamped it with `SQL SECURITY DEFINER`
// bound to the account that ran the migration. That makes the view non-portable:
// once a database is restored under a different MySQL user (Ghost(Pro) restores,
// self-host server moves) the view errors at query time because the original
// account does not exist on the target, and the account name leaks into every
// mysqldump. Recreate it through commands.createViewOrReplace, which forces
// `SQL SECURITY INVOKER` on MySQL. CREATE OR REPLACE swaps the definition in
// place, so existing installs are fixed without dropping the view.
module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Recreating members_resolved_subscription view with SQL SECURITY INVOKER');
        await commands.createViewOrReplace('members_resolved_subscription', views.members_resolved_subscription, knex);
    },
    async function down(knex) {
        logging.info('Recreating members_resolved_subscription view with default security');
        await knex.schema.createViewOrReplace('members_resolved_subscription', function (view) {
            view.as(knex.raw(views.members_resolved_subscription));
        });
    }
);
