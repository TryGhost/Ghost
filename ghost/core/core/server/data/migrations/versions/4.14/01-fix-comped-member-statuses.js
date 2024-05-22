const {chunk} = require('lodash');
const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(async function up(knex) {
    // eslint-disable-next-line no-restricted-syntax
    const compedMemberIds = (await knex('members')
        .select('members.id')
        .innerJoin(
            'members_stripe_customers',
            'members.id',
            'members_stripe_customers.member_id'
        ).innerJoin(
            'members_stripe_customers_subscriptions',
            function () {
                this.on(
                    'members_stripe_customers.customer_id',
                    'members_stripe_customers_subscriptions.customer_id'
                ).onIn(
                    'members_stripe_customers_subscriptions.status',
                    ['active', 'trialing', 'past_due', 'unpaid']
                );
            }
        ).where(
            'members_stripe_customers_subscriptions.plan_nickname',
            '=',
            'Complimentary'
        ).andWhere(
            'members.status',
            '!=',
            'comped'
        )).map(({id}) => id);

    if (!compedMemberIds.length) {
        logging.warn('No Complimentary members found with incorrect status');
        return;
    } else {
        logging.info(`Found ${compedMemberIds.length} Complimentary members with the incorrect status`);
    }

    // Umm? Well... The current version of SQLite3 bundled with Ghost supports
    // a maximum of 999 variables, we use one variable for the SET value
    // and so we're left with 998 for our WHERE IN clause values
    const chunkSize = 998;

    const compedMemberIdChunks = chunk(compedMemberIds, chunkSize);

    // eslint-disable-next-line no-restricted-syntax
    for (const compedMemberIdsChunk of compedMemberIdChunks) {
        await knex('members')
            .update('status', 'comped')
            .whereIn('id', compedMemberIdsChunk);
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const memberId of compedMemberIds) {
        const mostRecentStatusEvent = await knex('members_status_events')
            .select('*')
            .where('member_id', memberId)
            .orderBy('created_at', 'desc')
            .limit(1)
            .first();

        if (!mostRecentStatusEvent) {
            logging.warn(`Could not find a status event for member ${memberId} - skipping this member`);
        } else if (mostRecentStatusEvent.to_status !== 'comped') {
            logging.info(`Updating members_status_event ${mostRecentStatusEvent.id}`);
            await knex('members_status_events')
                .update('to_status', 'comped')
                .where('id', mostRecentStatusEvent.id);
        }
    }
}, async function down() {});
