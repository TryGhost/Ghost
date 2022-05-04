const logging = require('@tryghost/logging');
const urlUtils = require('../../../../../shared/url-utils');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const newsletters = await knex.select('id', 'header_image').from('newsletters').whereNotNull('header_image');

        logging.info(`Transforming header_image to transformReady format for ${newsletters.length} newsletters.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const newsletter of newsletters) {
            await knex('newsletters').update('header_image', urlUtils.toTransformReady(newsletter.header_image)).where('id', newsletter.id);
        }
    },
    async function down(knex) {
        const newsletters = await knex.select('id', 'header_image').from('newsletters').whereNotNull('header_image');

        logging.info(`Transforming header_image to absolute format for ${newsletters.length} newsletters.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const newsletter of newsletters) {
            await knex('newsletters').update('header_image', urlUtils.transformReadyToAbsolute(newsletter.header_image)).where('id', newsletter.id);
        }
    }
);
