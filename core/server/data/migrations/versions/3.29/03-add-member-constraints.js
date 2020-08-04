const logging = require('../../../../../shared/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        if (knex.client.config.client !== 'mysql') {
            return logging.warn('Skipping member tables index creation - database is not MySQL');
        }

        const [membersLabelsIndexes] = await knex.raw('SHOW INDEXES FROM members_labels');
        const [membersStripeCustomersIndexes] = await knex.raw('SHOW INDEXES FROM members_stripe_customers');
        const [membersStripeCustomersSubscriptionsIndexes] = await knex.raw('SHOW INDEXES from members_stripe_customers_subscriptions');

        if (membersLabelsIndexes.find(index => index.Key_name === 'members_labels_member_id_foreign')) {
            logging.warn('Skipping "members_labels_member_id_foreign" foreign key constraint creation - already exists');
        } else {
            logging.info('Adding "members_labels_member_id_foreign" foreign key constraint');
            await knex.schema.alterTable('members_labels', (table) => {
                table.foreign('member_id').references('members.id').onDelete('CASCADE');
            });
        }

        if (membersStripeCustomersIndexes.find(index => index.Key_name === 'members_stripe_customers_member_id_foreign')) {
            logging.warn('Skipping "members_stripe_customers_member_id_foreign" foreign key constraint creation - already exists');
        } else {
            logging.info('Adding "members_stripe_customers_member_id_foreign" foreign key constraint');
            await knex.schema.alterTable('members_stripe_customers', (table) => {
                table.foreign('member_id').references('members.id').onDelete('CASCADE');
            });
        }

        if (membersStripeCustomersIndexes.find(index => index.Key_name === 'members_stripe_customers_customer_id_unique')) {
            logging.warn('Skipping "members_stripe_customers_customer_id_unique" index creation - already exists');
        } else {
            logging.info('Adding "members_stripe_customers_customer_id_unique" index');
            await knex.schema.alterTable('members_stripe_customers', (table) => {
                table.unique('customer_id');
            });
        }

        if (membersStripeCustomersSubscriptionsIndexes.find(index => index.Key_name === 'members_stripe_customers_subscriptions_customer_id_foreign')) {
            logging.warn('Skipping "members_stripe_customers_subscriptions_customer_id_foreign" foreign key constraint creation - already exists');
        } else {
            logging.info('Adding "members_stripe_customers_subscriptions_customer_id_foreign" foreign key constraint');
            await knex.schema.alterTable('members_stripe_customers_subscriptions', (table) => {
                table.foreign('customer_id').references('members_stripe_customers.customer_id').onDelete('CASCADE');
            });
        }
    },

    async down({transacting: knex}) {
        if (knex.client.config.client !== 'mysql') {
            return logging.warn('Skipping member tables index removal - database is not MySQL');
        }

        const [membersLabelsIndexes] = await knex.raw('SHOW INDEXES FROM members_labels');
        const [membersStripeCustomersIndexes] = await knex.raw('SHOW INDEXES FROM members_stripe_customers');
        const [membersStripeCustomersSubscriptionsIndexes] = await knex.raw('SHOW INDEXES from members_stripe_customers_subscriptions');

        if (!membersStripeCustomersSubscriptionsIndexes.find(index => index.Key_name === 'members_stripe_customers_subscriptions_customer_id_foreign')) {
            logging.warn('Skipping "members_stripe_customers_subscriptions_customer_id_foreign" foreign key constraint removal - does not exist');
        } else {
            logging.info('Dropping "members_stripe_customers_subscriptions_customer_id_foreign" foreign key constraint');
            await knex.schema.alterTable('members_stripe_customers_subscriptions', (table) => {
                table.dropForeign('customer_id');
                // mysql automatically creates an index for the foreign key which will be left behind after dropping foreign key constraint
                table.dropIndex('customer_id', 'members_stripe_customers_subscriptions_customer_id_foreign');
            });
        }

        if (!membersStripeCustomersIndexes.find(index => index.Key_name === 'members_stripe_customers_customer_id_unique')) {
            logging.warn('Skipping "members_stripe_customers_customer_id_unique" index removal - does not exist');
        } else {
            logging.info('Dropping "members_stripe_customers_customer_id_unique" index');
            await knex.schema.alterTable('members_stripe_customers', (table) => {
                table.dropUnique('customer_id');
            });
        }

        if (!membersStripeCustomersIndexes.find(index => index.Key_name === 'members_stripe_customers_member_id_foreign')) {
            logging.warn('Skipping "members_stripe_customers_member_id_foreign" foreign key constraint removal - already exists');
        } else {
            logging.info('Dropping "members_stripe_customers_member_id_foreign" foreign key constraint');
            await knex.schema.alterTable('members_stripe_customers', (table) => {
                table.dropForeign('member_id');
                table.dropIndex('member_id', 'members_stripe_customers_member_id_foreign');
            });
        }

        if (!membersLabelsIndexes.find(index => index.Key_name === 'members_labels_member_id_foreign')) {
            logging.warn('Skipping "members_labels_member_id_foreign" foreign key constraint removal - already exists');
        } else {
            logging.info('Dropping "members_labels_member_id_foreign" foreign key constraint');
            await knex.schema.alterTable('members_labels', (table) => {
                table.dropForeign('member_id');
                table.dropIndex('member_id', 'members_labels_member_id_foreign');
            });
        }
    }
};
