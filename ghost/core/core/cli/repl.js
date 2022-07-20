const Command = require('./command');
const chalk = require('chalk');

module.exports = class REPL extends Command {
    setup() {
        this.help('Launches a REPL environment with access to a configured db instance and models');
        // this is only here to demo how to set a default value for an arg :)
        this.argument('--color', {type: 'string', defaultValue: 'yellow', hidden: true});
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

    async handle(argv = {}) {
        this.debug(chalk[argv.color]('== Ghost development REPL =='));
        this.info(`a knex database instance is available as ${chalk.magenta('knex')}`);
        this.info(`bookshelf models are available as ${chalk.magenta('models')}`);
        const repl = require('repl');
        const cli = repl.start('> ');
        this.initializeContext(cli.context);
        cli.on('reset', this.initializeContext);
    }
};
