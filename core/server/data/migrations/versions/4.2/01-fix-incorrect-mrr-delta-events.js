const {createTransactionalMigration} = require('../../utils');
const logging = require('../../../../../shared/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Fixing incorrect mrr_delta in members_paid_subscription_events table');
        const allIncorrectEvents = await knex
            .select('id', 'mrr_delta')
            .from('members_paid_subscription_events')
            .where('from_plan', '=', knex.ref('to_plan'))
            .where('mrr_delta', '<', 0);

        const correctedEvents = allIncorrectEvents.filter(({mrr_delta: mrrDelta}) => {
            return (mrrDelta % 2 === 0);
        }).map(({id, mrr_delta: mrrDelta}) => {
            return {
                id,
                mrrDelta: mrrDelta / 2
            };
        });

        logging.info(`Updating mrr_delta for ${correctedEvents.length} events`);
        for (const event of correctedEvents) {
            await knex('members_paid_subscription_events')
                .where({id: event.id})
                .update({
                    mrr_delta: event.mrrDelta
                });
        }
    },
    async function down() {
        // noop
    }
);
