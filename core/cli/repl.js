const Command = require('./command');

module.exports = class REPL extends Command {
    initializeContext(context) {
        const models = require('../server/models');
        const knex = require('../server/data/db/connection');

        models.init();

        context.models = models;
        context.m = models;
        context.knex = knex;
        context.k = knex;
    }

    async handle() {
        const repl = require('repl');
        const cli = repl.start('> ');
        this.initializeContext(cli.context);
    }
};
