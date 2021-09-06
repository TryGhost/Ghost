const {chunk} = require('lodash');
const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(async function up(knex) {
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

    for (const compedMemberIdsChunk of compedMemberIdChunks) {
        await knex('members')
            .update('status', 'comped')
            .whereIn('id', compedMemberIdsChunk);
    }
}, async function down() {});
