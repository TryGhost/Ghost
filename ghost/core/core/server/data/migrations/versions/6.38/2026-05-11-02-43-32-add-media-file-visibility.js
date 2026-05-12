const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');

const visibilitySpec = {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'library',
    validations: {
        isIn: [['library', 'system', 'hidden']]
    }
};

function storagePathFromContentUrl(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const match = value
        .replace(/\\u002F/g, '/')
        .replace(/\\\//g, '/')
        .match(/content\/files\/(.+)$/);

    return match ? match[1].split('?')[0] : null;
}

async function addVisibilityColumn(connection) {
    const hasColumn = await connection.schema.hasColumn('media_files', 'visibility');
    if (hasColumn) {
        logging.warn('Skipping adding column: media_files.visibility - column already exists');
        return;
    }

    logging.info('Adding column: media_files.visibility');
    await commands.addColumn('media_files', 'visibility', connection, visibilitySpec);
    await commands.addIndex('media_files', 'visibility', connection);
}

async function markPinturaAssetsAsSystem(connection) {
    const hasMediaFiles = await connection.schema.hasTable('media_files');
    const hasSettings = await connection.schema.hasTable('settings');

    if (!hasMediaFiles || !hasSettings) {
        logging.warn('Skipping marking Pintura media assets as system - required tables are missing');
        return;
    }

    const settings = await connection('settings')
        .select('value')
        .whereIn('key', ['pintura_js_url', 'pintura_css_url']);
    const storagePaths = settings
        .map(setting => storagePathFromContentUrl(setting.value))
        .filter(Boolean);

    if (!storagePaths.length) {
        logging.info('No Pintura media assets found to mark as system');
        return;
    }

    logging.info(`Marking ${storagePaths.length} Pintura media asset(s) as system`);
    await connection('media_files')
        .where({storage_type: 'files'})
        .whereIn('storage_path', storagePaths)
        .update({
            visibility: 'system',
            updated_at: new Date()
        });
}

async function dropVisibilityColumn(connection) {
    const hasColumn = await connection.schema.hasColumn('media_files', 'visibility');
    if (!hasColumn) {
        logging.warn('Skipping dropping column: media_files.visibility - column does not exist');
        return;
    }

    logging.info('Dropping column: media_files.visibility');
    await commands.dropColumn('media_files', 'visibility', connection, visibilitySpec);
}

module.exports = createNonTransactionalMigration(
    async function up(connection) {
        await addVisibilityColumn(connection);
        await markPinturaAssetsAsSystem(connection);
    },
    async function down(connection) {
        await dropVisibilityColumn(connection);
    }
);
