const logging = require('../../../../../shared/logging');
const commands = require('../../../schema/commands');

module.exports = {
    config: {
        transaction: true
    },

    async up(options){
        const conn = options.transacting || options.connection;
        const hasTable = await conn.schema.hasTable('members_stripe_customers_subscriptions');

        if (hasTable) {
            logging.warn('Adding table: members_stripe_customers_subscriptions');
            return;
        }

        logging.info('Adding table: members_stripe_customers_subscriptions');
        return commands.createTable('members_stripe_customers_subscriptions', conn);
    },

    async down(options){
        const conn = options.transacting || options.connection;
        const hasTable = await conn.schema.hasTable('members_stripe_customers_subscriptions');

        if (!hasTable) {
            logging.warn('Dropping table: members_stripe_customers_subscriptions');
            return;
        }

        logging.info('Dropping table: members_stripe_customers_subscriptions');
        return commands.deleteTable('members_stripe_customers_subscriptions', conn);
    }
};
