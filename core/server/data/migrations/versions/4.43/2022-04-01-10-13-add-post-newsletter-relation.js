const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const commands = require('../../../schema/commands');

const table = 'posts';
const column = 'newsletter_id';
const columnDefinition = {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'newsletters.id'
};

module.exports = {
    config: {
        transaction: true
    },
    async up(config) {
        const knex = config.transacting;

        const hasColumn = await knex.schema.hasColumn(table, column);

        if (hasColumn) {
            logging.info(`Adding ${table}.${column} column - skipping as table is correct`);
            return;
        }

        logging.info(`Adding ${table}.${column} column`);

        if (DatabaseInfo.isSQLite(knex)) {
            await commands.addColumn(table, column, knex, columnDefinition);
            return;
        }

        await knex.raw('alter table `posts` add column `newsletter_id` varchar(24) null, algorithm=copy;');

        await knex.raw('alter table `posts` add constraint `posts_newsletter_id_foreign` foreign key (`newsletter_id`) references `newsletters` (`id`);');
    },
    async down(config) {
        const knex = config.transacting;

        const hasColumn = await knex.schema.hasColumn(table, column);

        if (!hasColumn) {
            logging.info(`Removing ${table}.${column} column - skipping as table is correct`);
            return;
        }

        logging.info(`Removing ${table}.${column} column`);

        if (DatabaseInfo.isSQLite(knex)) {
            await commands.dropColumn(table, column, knex, columnDefinition);
            return;
        }

        await knex.raw('alter table `posts` drop foreign key `posts_newsletter_id_foreign`;');

        await knex.raw('alter table `posts` drop `newsletter_id`;');
    }
};

