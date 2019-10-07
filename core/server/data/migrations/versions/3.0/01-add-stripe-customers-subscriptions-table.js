const common = require('../../../../lib/common');
const commands = require('../../../schema/commands');

module.exports = {
    config: {
        transaction: true
    },

    async up(options){
        const conn = options.transacting || options.connection;
        const hasTable = await conn.schema.hasTable('stripe_customers_subscriptions');

        if (hasTable) {
            common.logging.warn('Adding table: stripe_customers_subscriptions');
            return;
        }

        common.logging.info('Adding table: stripe_customers_subscriptions');
        return commands.createTable('stripe_customers_subscriptions', conn);
    },

    async down(options){
        const conn = options.transacting || options.connection;
        const hasTable = await conn.schema.hasTable('stripe_customers_subscriptions');

        if (!hasTable) {
            common.logging.warn('Dropping table: stripe_customers_subscriptions');
            return;
        }

        common.logging.info('Dropping table: stripe_customers_subscriptions');
        return commands.deleteTable('stripe_customers_subscriptions', conn);
    }
};
