const {chunk} = require('lodash');
const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Updating members.status based on members_stripe_customers_subscriptions.status');
        // eslint-disable-next-line no-restricted-syntax
        const paidMemberIds = (await knex('members')
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
            )).map(({id}) => id);

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
            )).map(({id}) => id);

        // Umm? Well... The current version of SQLite3 bundled with Ghost supports
        // a maximum of 999 variables, we use one variable for the SET value
        // and so we're left with 998 for our WHERE IN clause values
        const chunkSize = 998;

        const paidMemberIdChunks = chunk(paidMemberIds, chunkSize);

        // eslint-disable-next-line no-restricted-syntax
        for (const paidMemberIdsChunk of paidMemberIdChunks) {
            await knex('members')
                .update('status', 'paid')
                .whereIn('id', paidMemberIdsChunk);
        }

        const compedMemberIdChunks = chunk(compedMemberIds, chunkSize);

        // eslint-disable-next-line no-restricted-syntax
        for (const compedMemberIdsChunk of compedMemberIdChunks) {
            await knex('members')
                .update('status', 'comped')
                .whereIn('id', compedMemberIdsChunk);
        }
    },
    async function down(knex) {
        logging.info('Updating all members status to "free"');
        return knex('members').update({
            status: 'free'
        });
    }
);
