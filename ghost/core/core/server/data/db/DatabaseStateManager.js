const KnexMigrator = require('knex-migrator');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const states = {
    READY: 0,
    NEEDS_INITIALISATION: 1,
    NEEDS_MIGRATION: 2,
    ERROR: 3
};

const printState = ({state}) => {
    if (state === states.READY) {
        logging.info('Database is in a ready state.');
    }

    if (state === states.NEEDS_INITIALISATION) {
        logging.warn('Database state requires initialisation.');
    }

    if (state === states.NEEDS_MIGRATION) {
        logging.warn('Database state requires migration.');
    }

    if (state === states.ERROR) {
        logging.error('Database is in an error state.');
    }
};

class DatabaseStateManager {
    constructor({knexMigratorFilePath}) {
        this.knexMigrator = new KnexMigrator({
            knexMigratorFilePath
        });
    }

    async getState() {
        let state = states.READY;
        try {
            await this.knexMigrator.isDatabaseOK();
            return state;
        } catch (error) {
            // CASE: database has not yet been initialized
            if (error.code === 'DB_NOT_INITIALISED') {
                state = states.NEEDS_INITIALISATION;
                return state;
            }

            // CASE: there's no migration table so we can't understand
            if (error.code === 'MIGRATION_TABLE_IS_MISSING') {
                state = states.NEEDS_INITIALISATION;
                return state;
            }

            // CASE: database needs migrations
            if (error.code === 'DB_NEEDS_MIGRATION') {
                state = states.NEEDS_MIGRATION;
                return state;
            }

            // CASE: database connection errors, unknown cases
            let errorToThrow = error;
            if (!errors.utils.isGhostError(errorToThrow)) {
                errorToThrow = new errors.InternalServerError({message: errorToThrow.message, err: errorToThrow});
            }

            throw errorToThrow;
        }
    }

    async makeReady() {
        try {
            let state = await this.getState();

            printState({state});

            if (state === states.READY) {
                return;
            }

            if (state === states.NEEDS_INITIALISATION) {
                await this.knexMigrator.init();
            }

            if (state === states.NEEDS_MIGRATION) {
                await this.knexMigrator.migrate();
            }

            state = await this.getState();

            printState({state});
        } catch (error) {
            let errorToThrow = error;
            if (!errors.utils.isGhostError(error)) {
                errorToThrow = new errors.InternalServerError({message: errorToThrow.message, err: errorToThrow});
            }

            throw errorToThrow;
        }
    }
}

module.exports = DatabaseStateManager;
