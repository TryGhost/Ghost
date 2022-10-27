const Command = require('./command');
const DataGenerator = require('@tryghost/data-generator');

module.exports = class REPL extends Command {
    setup() {
        this.help('Generates random data to populate the database for development & testing');
        this.argument('--use-base-data', {type: 'boolean', defaultValue: false, desc: 'Only generate data outside of a defined base data set'});
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
        const dataGenerator = new DataGenerator({
            useBaseData: argv['use-base-data'],
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
            modelQuantities: {}
        });
        try {
            await dataGenerator.importData();
        } catch (error) {
            this.fatal('Failed while generating data: ', error);
        }
        knex.destroy();
    }
};
