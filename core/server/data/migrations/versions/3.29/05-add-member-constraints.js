const logging = require('../../../../../shared/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        if (knex.client.config.client !== 'mysql') {
            return logging.warn('Skipping member tables index creation - database is not MySQL');
        }

        // member_labels already has a foreign key constraint, we want to add ON DELETE CASCADE

        const dbName = knex.client.config.connection.database;
        const [dbConstraints] = await knex.raw('SELECT * FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?', [dbName]);

        const memberIdConstraint = dbConstraints.find(constraint => constraint.CONSTRAINT_NAME === 'members_labels_member_id_foreign');
        if (memberIdConstraint && memberIdConstraint.DELETE_RULE === 'CASCADE') {
            logging.warn('Skipping ON DELETE CASCADE for "members_labels_member_id_foreign" constraint - already set');
        } else if (memberIdConstraint) {
            logging.info('Adding ON DELETE CASCADE to "members_labels_member_id_foreign" constraint');
            // first drop the key
            await knex.schema.alterTable('members_labels', (table) => {
                table.dropForeign('member_id');
                table.dropIndex('member_id', 'members_labels_member_id_foreign');
            });
            // then re-add with ON DELETE CASCADE
            await knex.schema.alterTable('members_labels', (table) => {
                table.foreign('member_id').references('members.id').onDelete('CASCADE');
            });
        }

        const labelIdConstraint = dbConstraints.find(constraint => constraint.CONSTRAINT_NAME === 'members_labels_label_id_foreign');
        if (labelIdConstraint && labelIdConstraint.DELETE_RULE === 'CASCADE') {
            logging.warn('Skipping ON DELETE CASCADE for "members_labels_label_id_foreign" constraint - already set');
        } else if (labelIdConstraint) {
            logging.info('Adding ON DELETE CASCADE to "members_labels_label_id_foreign" constraint');
            // first drop the key
            await knex.schema.alterTable('members_labels', (table) => {
                table.dropForeign('label_id');
                table.dropIndex('label_id', 'members_labels_label_id_foreign');
            });
            // then re-add with ON DELETE CASCADE
            await knex.schema.alterTable('members_labels', (table) => {
                table.foreign('label_id').references('labels.id').onDelete('CASCADE');
            });
        }

        // stripe tables have not had any indexes/constraints in the past, add them now with ON DELETE CASCADE

        const [membersStripeCustomersIndexes] = await knex.raw('SHOW INDEXES FROM members_stripe_customers');

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

        const [membersStripeCustomersSubscriptionsIndexes] = await knex.raw('SHOW INDEXES from members_stripe_customers_subscriptions');

        if (membersStripeCustomersSubscriptionsIndexes.find(index => index.Key_name === 'members_stripe_customers_subscriptions_subscription_id_unique')) {
            logging.warn('Skipping "members_stripe_customers_subscriptions_subscription_id_unique" index creation - already exists');
        } else {
            logging.info('Adding "members_stripe_customers_subscriptions_subscription_id_unique" index');
            await knex.schema.alterTable('members_stripe_customers_subscriptions', (table) => {
                table.unique('subscription_id');
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

        if (!membersStripeCustomersSubscriptionsIndexes.find(index => index.Key_name === 'members_stripe_customers_subscriptions_subscription_id_unique')) {
            logging.warn('Skipping "members_stripe_customers_subscriptions_subscription_id_unique" index removal - does not exist');
        } else {
            logging.info('Dropping "members_stripe_customers_subscriptions_subscription_id_unique" index');
            await knex.schema.alterTable('members_stripe_customers_subscriptions', (table) => {
                table.dropUnique('subscription_id');
            });
        }

        const [membersStripeCustomersIndexes] = await knex.raw('SHOW INDEXES FROM members_stripe_customers');

        if (!membersStripeCustomersIndexes.find(index => index.Key_name === 'members_stripe_customers_customer_id_unique')) {
            logging.warn('Skipping "members_stripe_customers_customer_id_unique" index removal - does not exist');
        } else {
            logging.info('Dropping "members_stripe_customers_customer_id_unique" index');
            await knex.schema.alterTable('members_stripe_customers', (table) => {
                table.dropUnique('customer_id');
            });
        }

        if (!membersStripeCustomersIndexes.find(index => index.Key_name === 'members_stripe_customers_member_id_foreign')) {
            logging.warn('Skipping "members_stripe_customers_member_id_foreign" foreign key constraint removal - does not exist');
        } else {
            logging.info('Dropping "members_stripe_customers_member_id_foreign" foreign key constraint');
            await knex.schema.alterTable('members_stripe_customers', (table) => {
                table.dropForeign('member_id');
                table.dropIndex('member_id', 'members_stripe_customers_member_id_foreign');
            });
        }

        const dbName = knex.client.config.connection.database;
        const [dbConstraints] = await knex.raw('SELECT * FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?', [dbName]);

        const memberIdConstraint = dbConstraints.find(constraint => constraint.CONSTRAINT_NAME === 'members_labels_member_id_foreign');
        if (memberIdConstraint && memberIdConstraint.DELETE_RULE !== 'CASCADE') {
            logging.warn('Skipping removal of ON DELETE CASCADE for "members_labels_member_id_foreign" constraint - not set');
        } else if (memberIdConstraint) {
            logging.info('Removing ON DELETE CASCADE from "members_labels_member_id_foreign" constraint');
            // first drop the key
            await knex.schema.alterTable('members_labels', (table) => {
                table.dropForeign('member_id');
                table.dropIndex('member_id', 'members_labels_member_id_foreign');
            });
            // then re-add without ON DELETE CASCADE
            await knex.schema.alterTable('members_labels', (table) => {
                table.foreign('member_id').references('members.id');
            });
        }

        const labelIdConstraint = dbConstraints.find(constraint => constraint.CONSTRAINT_NAME === 'members_labels_label_id_foreign');
        if (labelIdConstraint && labelIdConstraint.DELETE_RULE !== 'CASCADE') {
            logging.warn('Skipping removal of ON DELETE CASCADE for "members_labels_label_id_foreign" constraint - not set');
        } else if (labelIdConstraint) {
            logging.info('Removing ON DELETE CASCADE from "members_labels_label_id_foreign" constraint');
            // first drop the key
            await knex.schema.alterTable('members_labels', (table) => {
                table.dropForeign('label_id');
                table.dropIndex('label_id', 'members_labels_label_id_foreign');
            });
            // then re-add without ON DELETE CASCADE
            await knex.schema.alterTable('members_labels', (table) => {
                table.foreign('label_id').references('labels.id');
            });
        }
    }
};
