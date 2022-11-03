const Command = require('./command');
const DataGenerator = require('@tryghost/data-generator');

module.exports = class REPL extends Command {
    setup() {
        this.help('Generates random data to populate the database for development & testing');
        this.argument('--base-data-pack', {type: 'string', defaultValue: '', desc: 'Base data pack file location, imported instead of random content'});
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
