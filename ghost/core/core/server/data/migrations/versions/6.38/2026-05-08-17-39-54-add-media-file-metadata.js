const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');

const metadataColumns = {
    alt_text: {type: 'string', maxlength: 2000, nullable: true},
    caption: {type: 'text', maxlength: 65535, nullable: true}
};

async function addColumn(connection, columnName, columnSpec) {
    const hasColumn = await connection.schema.hasColumn('media_files', columnName);
    if (hasColumn) {
        logging.warn(`Skipping adding column: media_files.${columnName} - column already exists`);
        return;
    }

    logging.info(`Adding column: media_files.${columnName}`);
    await commands.addColumn('media_files', columnName, connection, columnSpec);
}

async function dropColumn(connection, columnName, columnSpec) {
    const hasColumn = await connection.schema.hasColumn('media_files', columnName);
    if (!hasColumn) {
        logging.warn(`Skipping dropping column: media_files.${columnName} - column does not exist`);
        return;
    }

    logging.info(`Dropping column: media_files.${columnName}`);
    await commands.dropColumn('media_files', columnName, connection, columnSpec);
}

module.exports = createNonTransactionalMigration(
    async function up(connection) {
        await addColumn(connection, 'alt_text', metadataColumns.alt_text);
        await addColumn(connection, 'caption', metadataColumns.caption);
    },
    async function down(connection) {
        await dropColumn(connection, 'caption', metadataColumns.caption);
        await dropColumn(connection, 'alt_text', metadataColumns.alt_text);
    }
);
