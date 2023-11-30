const Command = require('./command');
const DataGenerator = require('@tryghost/data-generator');
const config = require('../shared/config');

module.exports = class DataGeneratorCommand extends Command {
    setup() {
        this.help('Generates random data to populate the database for development & testing');
        this.argument('--base-data-pack', {type: 'string', defaultValue: '', desc: 'Base data pack file location, imported instead of random content'});
        this.argument('--quantity', {type: 'number', desc: 'When importing a single table, the quantity to import'});
        this.argument('--clear-database', {type: 'boolean', defaultValue: false, desc: 'Clear all entries in the database before importing'});
        this.argument('--tables', {type: 'string', desc: 'Only import the specified list of tables, where quantities can be specified by appending a colon followed by the quantity for each table. Example: --tables=members:1000,posts,tags,members_login_events'});
        this.argument('--with-default', {type: 'boolean', defaultValue: false, desc: 'Include default tables as well as those specified (simply override quantities)'});
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

        const tables = (argv.tables ? argv.tables.split(',') : []).map(table => ({
            name: table.split(':')[0],
            quantity: parseInt(table.split(':')[1]) || undefined
        }));

        const dataGenerator = new DataGenerator({
            baseDataPack: argv['base-data-pack'],
            knex,
            logger: {
                log: this.log,
                ok: this.ok,
                info: this.info,
                warn: this.warn,
                error: this.error,
                fatal: this.fatal,
                debug: this.debug
            },
            baseUrl: config.getSiteUrl(),
            clearDatabase: argv['clear-database'],
            tables,
            withDefault: argv['with-default']
        });
        try {
            await dataGenerator.importData();
        } catch (error) {
            this.fatal('Failed while generating data: ', error);
        }
        knex.destroy();
    }
};
