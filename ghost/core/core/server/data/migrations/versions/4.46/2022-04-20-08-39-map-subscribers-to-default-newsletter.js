const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding existing subscribers to default newsletter');

        const newsletter = await knex('newsletters')
            .orderBy('sort_order', 'asc')
            .orderBy('created_at', 'asc')
            .first('id', 'name');

        if (!newsletter) {
            logging.info(`Default newsletter not found - skipping`);
            return;
        }

        // This is at the start of the up() instead of at the end of the down()
        // to maintain idempotency
        logging.info('Removing existing newsletter subscriptions');
        await knex('members_newsletters').delete();

        logging.info(`Subscribing members to newsletter '${newsletter.name}'`);

        const memberIds = await knex('members')
            .where({subscribed: true})
            .pluck('id');

        if (!memberIds.length) {
            logging.info(`No members to subscribe - skipping`);
            return;
        }

        logging.info(`Found ${memberIds.length} members to subscribe`);

        const pivotRows = memberIds.map((memberId) => {
            return {
                id: ObjectID().toHexString(),
                member_id: memberId,
                newsletter_id: newsletter.id
            };
        });

        await knex.batchInsert('members_newsletters', pivotRows);
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
