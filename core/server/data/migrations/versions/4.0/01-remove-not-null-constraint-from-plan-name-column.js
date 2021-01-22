const {createNonTransactionalMigration} = require('../../utils');
const {createTable, deleteTable} = require('../../../schema/commands');
const logging = require('../../../../../shared/logging');

const tableDef = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    customer_id: {type: 'string', maxlength: 255, nullable: false, unique: false, references: 'members_stripe_customers.customer_id', cascadeDelete: true},
    subscription_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
    plan_id: {type: 'string', maxlength: 255, nullable: false, unique: false},
    status: {type: 'string', maxlength: 50, nullable: false},
    cancel_at_period_end: {type: 'bool', nullable: false, defaultTo: false},
    cancellation_reason: {type: 'string', maxlength: 500, nullable: true},
    current_period_end: {type: 'dateTime', nullable: false},
    start_date: {type: 'dateTime', nullable: false},
    default_payment_card_last4: {type: 'string', maxlength: 4, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    created_by: {type: 'string', maxlength: 24, nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    updated_by: {type: 'string', maxlength: 24, nullable: true},
    plan_nickname: {type: 'string', maxlength: 50, nullable: true},
    plan_interval: {type: 'string', maxlength: 50, nullable: false},
    plan_amount: {type: 'integer', nullable: false},
    plan_currency: {type: 'string', maxLength: 3, nullable: false}
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (knex.client.config.client === 'mysql') {
            logging.info('Removing NOT_NULL constraint from members_stripe_customers_subscriptions:plan_nickname');
            await knex.schema.alterTable('members_stripe_customers_subscriptions', (table) => {
                table.string('plan_nickname').nullable().alter();
            });
        } else {
            // SQLite3 doesn't support altering columns, so we have to do a wee dance with a temp table.
            logging.info('Creating temporary table temp_members_stripe_customers_subscriptions');

            await createTable('temp_members_stripe_customers_subscriptions', knex, tableDef);

            logging.info('Copying data to temporary table temp_members_stripe_customers_subscriptions');
            await knex.raw(`
                INSERT INTO temp_members_stripe_customers_subscriptions
                SELECT * FROM members_stripe_customers_subscriptions
            `);

            logging.info('Dropping table members_stripe_customers_subscriptions');
            await deleteTable('members_stripe_customers_subscriptions', knex);

            logging.info('Creating table members_stripe_customers_subscriptions');
            await createTable('members_stripe_customers_subscriptions', knex, tableDef);

            logging.info('Copying data from temporary table to members_stripe_customers_subscriptions');
            await knex.raw(`
                INSERT INTO members_stripe_customers_subscriptions
                SELECT * FROM temp_members_stripe_customers_subscriptions
            `);

            logging.info('Dropping temporary table temp_members_stripe_customers_subscriptions');
            await deleteTable('temp_members_stripe_customers_subscriptions', knex);
        }
    },
    async function down() {
        // noop - we can't add a not null constraint after some of the columns have been nulled
    }
);
