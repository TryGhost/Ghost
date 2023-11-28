const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Adding index over members_newsletters(newsletter_id, member_id)');
        await knex.raw(`CREATE INDEX idx_members_newsletters_newsletter_id_member_id ON members_newsletters(newsletter_id, member_id);`);
    },
    async function down(knex) {
        logging.info('Dropping index over members_newsletters(newsletter_id, member_id)');
        try {
            await knex.raw(`ALTER TABLE members_newsletters DROP INDEX idx_members_newsletters_newsletter_id_member_id;`);
        } catch (err) {
            logging.error({
                err,
                message: 'Error dropping index over members_newsletters(newsletter_id, member_id)'
            });

            logging.info('Creating index over members_newsletters(newsletter_id)');
            await knex.raw(`CREATE INDEX members_newsletters_newsletter_id_foreign ON members_newsletters(newsletter_id);`);

            logging.info('Dropping index over members_newsletters(newsletter_id, member_id)');
            await knex.raw(`ALTER TABLE members_newsletters DROP INDEX idx_members_newsletters_newsletter_id_member_id;`);
        }
    }
);
