/* eslint-disable ghost/filenames/match-exported-class */
const Command = require('./command');
const DataGenerator = require('../server/data/seeders/DataGenerator');
const config = require('../shared/config');

const schemaTables = require('../server/data/schema').tables;

module.exports = class DataGeneratorCommand extends Command {
    setup() {
        this.help('Generates random data to populate the database for development & testing');
        this.argument('--base-data-pack', {type: 'string', defaultValue: '', desc: 'Base data pack file location, imported instead of random content'});
        this.argument('--clear-database', {type: 'boolean', defaultValue: false, desc: 'Clear all entries in the database before importing'});
        this.argument('--tables', {type: 'string', desc: 'Only import the specified list of tables, where quantities can be specified by appending a colon followed by the quantity for each table. Example: --tables=members:1000,posts,tags,members_login_events'});
        this.argument('--quantities', {type: 'string', desc: 'Allows you to specify different default quantities for specific tables without affecting the tables that are generated. Example: --quantities=members:1000'});
        this.argument('--with-default', {type: 'boolean', defaultValue: false, desc: 'Include default tables as well as those specified (simply override quantities)'});
        this.argument('--print-dependencies', {type: 'boolean', defaultValue: false, desc: 'Prints the dependency tree for the data generator and exits'});
        this.argument('--seed', {type: 'number', defaultValue: '', desc: 'Use a seed to reliably generate the same data on multiple runs (timestamps will still change a little bit to remain up to date)'});
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
        // If we can't stream, throw an error while creating the connection
        process.env.REQUIRE_INFILE_STREAM = '1';
        const knex = require('../server/data/db/connection');

        const tables = (argv.tables ? argv.tables.split(',') : []).map(table => ({
            name: table.split(':')[0],
            quantity: parseInt(table.split(':')[1]) || undefined
        }));

        /**
         * @type {Record<string, number>}
         */
        const quantities = {};

        if (argv.quantities) {
            for (const quantity of argv.quantities.split(',')) {
                const [table, amount] = quantity.split(':');

                if (amount === undefined || !isFinite(parseInt(amount))) {
                    this.fatal(`Missing quantity for table ${table}`);
                    return;
                }

                quantities[table] = parseInt(amount);
            }
        }

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
            schemaTables,
            withDefault: argv['with-default'],
            printDependencies: argv['print-dependencies'],
            quantities,
            seed: argv.seed || undefined
        });
        try {
            await dataGenerator.importData();
        } catch (error) {
            this.fatal('Failed while generating data: ', error);
        }
        knex.destroy();
    }
};
