const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Changing comments.in_reply_to_id foreign key to ON DELETE CASCADE');

        await commands.dropForeign({
            fromTable: 'comments',
            fromColumn: 'in_reply_to_id',
            toTable: 'comments',
            toColumn: 'id',
            transaction: knex
        });

        await commands.addForeign({
            fromTable: 'comments',
            fromColumn: 'in_reply_to_id',
            toTable: 'comments',
            toColumn: 'id',
            cascadeDelete: true,
            transaction: knex
        });
    },
    async function down(knex) {
        logging.info('Restoring comments.in_reply_to_id foreign key to ON DELETE SET NULL');

        await commands.dropForeign({
            fromTable: 'comments',
            fromColumn: 'in_reply_to_id',
            toTable: 'comments',
            toColumn: 'id',
            transaction: knex
        });

        await commands.addForeign({
            fromTable: 'comments',
            fromColumn: 'in_reply_to_id',
            toTable: 'comments',
            toColumn: 'id',
            setNullDelete: true,
            transaction: knex
        });
    }
);
