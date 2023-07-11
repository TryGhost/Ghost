const Command = require('./command');
const DataGenerator = require('@tryghost/data-generator');
const config = require('../shared/config');

module.exports = class DataGeneratorCommand extends Command {
    setup() {
        this.help('Generates random data to populate the database for development & testing');
        this.argument('--base-data-pack', {type: 'string', defaultValue: '', desc: 'Base data pack file location, imported instead of random content'});
        this.argument('--scale', {type: 'string', defaultValue: 'small', desc: 'Scale of the data to generate. `small` for a quick run, `large` for more content'});
        this.argument('--single-table', {type: 'string', desc: 'Import a single table'});
        this.argument('--quantity', {type: 'number', desc: 'When importing a single table, the quantity to import'});
        this.argument('--clear-database', {type: 'boolean', defaultValue: false, desc: 'Clear all entries in the database before importing'});
    }

    initializeContext(context) {
        const models = require('../server/models');
        const knex = require('../server/data/db/connection');

        models.init();

        context.models = models;
        context.m = models;
        context.knex = knex;
        context.k = knex;
    }

    permittedEnvironments() {
        return ['development', 'local', 'staging', 'production'];
    }

    async handle(argv = {}) {
        const knex = require('../server/data/db/connection');
        const {tables: schema} = require('../server/data/schema/index');

        const modelQuantities = {};
        if (argv.scale) {
            if (argv.scale === 'small') {
                modelQuantities.members = 200;
                modelQuantities.membersLoginEvents = 1;
                modelQuantities.posts = 10;
            }
            // Defaults in data-generator package make a large set
        }

        const dataGenerator = new DataGenerator({
            baseDataPack: argv['base-data-pack'],
            knex,
            schema,
            logger: {
                log: this.log,
                ok: this.ok,
                info: this.info,
                warn: this.warn,
                error: this.error,
                fatal: this.fatal,
                debug: this.debug
            },
            modelQuantities,
            baseUrl: config.getSiteUrl(),
            clearDatabase: argv['clear-database']
        });
        try {
            if (argv['single-table']) {
                await dataGenerator.importSingleTable(argv['single-table'], argv.quantity ?? undefined);
            } else {
                await dataGenerator.importData();
            }
        } catch (error) {
            this.fatal('Failed while generating data: ', error);
        }
        knex.destroy();
    }
};
