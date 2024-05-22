const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const commands = require('../../../schema/commands');
const {createTransactionalMigration} = require('../../utils');

const table = 'posts';
const column = 'newsletter_id';
const targetTable = 'newsletters';
const targetColumn = 'id';

const columnDefinition = {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: `${targetTable}.${targetColumn}`
};

/**
 * This migration is adding a new column `newsletter_id` to the table posts
 * that is a foreign key to `newsletters.id`.
 *
 * It isn't using the existing utils because of a performance issue. In MySQL,
 * adding a new row without `algorithm=copy` uses the INPLACE algorithm which
 * was too slow on big `posts` tables (~3 minutes for 10k posts). Switching to
 * the COPY algorithm fixed the issue (~3 seconds for 10k posts).
 */
module.exports = createTransactionalMigration(
    async function up(knex) {
        const hasColumn = await knex.schema.hasColumn(table, column);

        if (hasColumn) {
            logging.info(`Adding ${table}.${column} column - skipping as table is correct`);
            return;
        }

        logging.info(`Adding ${table}.${column} column`);

        // Use the default flow for SQLite because .toSQL() is tricky with SQLite
        if (DatabaseInfo.isSQLite(knex)) {
            await commands.addColumn(table, column, knex, columnDefinition);
            return;
        }

        // Add the column

        let sql = knex.schema.table(table, function (t) {
            t.string(column, 24);
        }).toSQL()[0].sql;

        if (DatabaseInfo.isMySQL(knex)) {
            // Guard against an ending semicolon
            sql = sql.replace(/;\s*$/, '') + ', algorithm=copy';
        }

        await knex.raw(sql);

        // Add the foreign key constraint

        await commands.addForeign({
            fromTable: table,
            fromColumn: column,
            toTable: targetTable,
            toColumn: targetColumn,
            cascadeDelete: false,
            transaction: knex
        });
    },
    async function down(knex) {
        const hasColumn = await knex.schema.hasColumn(table, column);

        if (!hasColumn) {
            logging.info(`Removing ${table}.${column} column - skipping as table is correct`);
            return;
        }

        logging.info(`Removing ${table}.${column} column`);

        // Use the default flow for SQLite because .toSQL() is tricky with SQLite
        if (DatabaseInfo.isSQLite(knex)) {
            await commands.dropColumn(table, column, knex, columnDefinition);
            return;
        }

        // Drop the foreign key constraint

        await commands.dropForeign({
            fromTable: table,
            fromColumn: column,
            toTable: targetTable,
            toColumn: targetColumn,
            transaction: knex
        });

        // Drop the column

        let sql = knex.schema.table(table, function (t) {
            t.dropColumn(column);
        }).toSQL()[0].sql;

        if (DatabaseInfo.isMySQL(knex)) {
            // Guard against an ending semicolon
            sql = sql.replace(/;\s*$/, '') + ', algorithm=copy';
        }

        await knex.raw(sql);
    }
);

