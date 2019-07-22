const KnexMigrator = require('knex-migrator'),
    config = require('../../config'),
    common = require('../../lib/common'),
    knexMigrator = new KnexMigrator({
        knexMigratorFilePath: config.get('paths:appRoot')
    });

module.exports.getState = () => {
    let state, err;

    return knexMigrator.isDatabaseOK()
        .then(() => {
            state = 1;
            return state;
        })
        .catch((_err) => {
            err = _err;

            // CASE: database was never created
            if (err.code === 'DB_NOT_INITIALISED') {
                state = 2;
                return state;
            }

            // CASE: you have created the database on your own, you have an existing none compatible db?
            if (err.code === 'MIGRATION_TABLE_IS_MISSING') {
                state = 3;
                return state;
            }

            // CASE: database needs migrations
            if (err.code === 'DB_NEEDS_MIGRATION') {
                state = 4;
                return state;
            }

            // CASE: database connection errors, unknown cases
            throw err;
        });
};

module.exports.dbInit = () => {
    return knexMigrator.init();
};

module.exports.migrate = () => {
    return knexMigrator.migrate();
};

module.exports.isDbCompatible = (connection) => {
    return connection.raw('SELECT `key` FROM settings WHERE `key`="databaseVersion";')
        .then((response) => {
            if (!response || !response[0].length) {
                return;
            }

            throw new common.errors.DatabaseVersionError({
                message: 'Your database version is not compatible with Ghost 2.0.',
                help: 'Want to keep your DB? Use Ghost < 1.0.0 or the "0.11" branch.' +
                      '\n\n\n' +
                      'Want to migrate Ghost 0.11 to 2.0? Please visit https://ghost.org/faq/upgrade-to-ghost-1-0/'
            });
        })
        .catch((err) => {
            // CASE settings table doesn't exists
            if (err.errno === 1146 || err.errno === 1) {
                return;
            }

            throw err;
        });
};
