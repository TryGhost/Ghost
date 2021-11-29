const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils.js');

module.exports = createTransactionalMigration(
    async function up(knex) {
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

        if (compedMemberIds.length === 0) {
            logging.info('No Members found with Complimentary subscriptions');
            return;
        }

        logging.info(`Updating ${compedMemberIds.length} Members status from 'paid' -> 'comped'`);

        await knex('members')
            .update('status', 'comped')
            .whereIn('id', compedMemberIds);
    },
    async function down(knex) {
        logging.info('Updating all member "comped" statuses to "paid"');
        await knex('members')
            .update('status', 'paid')
            .where('status', 'comped');
    }
);
