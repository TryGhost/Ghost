const chunk = require('lodash/chunk');
const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding existing subscribers to default newsletter');

        // This is at the start of the up() instead of at the end of the down()
        // to maintain idempotency
        logging.info('Removing existing newsletter subscriptions');
        await knex('members_newsletters').delete();

        const newsletter = await knex('newsletters')
            .orderBy('sort_order', 'asc')
            .first('id', 'name');

        logging.info(`Subscribing members to newsletter '${newsletter.name}'`);

        const memberIds = await knex('members')
            .where({subscribed: true})
            .pluck('id');

        if (!memberIds.length) {
            logging.info(`No members to subscribe - skipping`);
            return;
        }

        logging.info(`Found ${memberIds.length} members to subscribe`);

        let pivotRows = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const memberId of memberIds) {
            pivotRows.push({
                id: ObjectID().toHexString(),
                member_id: memberId,
                newsletter_id: newsletter.id
            });
        }
        
        const chunkSize = 1000;
        const pivotChunks = chunk(pivotRows, chunkSize);
        
        let memberCount = 0;
        // eslint-disable-next-line no-restricted-syntax
        for (const pivotChunk of pivotChunks) {
            await knex('members_newsletters').insert(pivotChunk);
            logging.info(`Subscribed ${memberCount += pivotChunk.length} members`);
        }
    },
    async function down(knex) {
        logging.info('Syncing subscriptions from newsletters -> members.subscribed');
        await knex('members')
            .whereIn('id', function () {
                this.select('member_id').from('members_newsletters');
            })
            .update({
                subscribed: true
            });
        logging.info('Syncing unsubscribes from newsletters -> members.subscribed');
        await knex('members')
            .whereNotIn('id', function () {
                this.select('member_id').from('members_newsletters');
            })
            .update({
                subscribed: false
            });
    }
);
