const common = require('../../../../lib/common');
const commands = require('../../../schema/commands');

module.exports = {
    config: {
        transaction: true
    },

    async up(options){
        const conn = options.transacting || options.connection;
        const hasTable = await conn.schema.hasTable('members_stripe_customers_subscriptions');

        if (hasTable) {
            common.logging.warn('Adding table: members_stripe_customers_subscriptions');
            return;
        }

        common.logging.info('Adding table: members_stripe_customers_subscriptions');
        return commands.createTable('members_stripe_customers_subscriptions', conn);
    },

    async down(options){
        const conn = options.transacting || options.connection;
        const hasTable = await conn.schema.hasTable('members_stripe_customers_subscriptions');

        if (!hasTable) {
            common.logging.warn('Dropping table: members_stripe_customers_subscriptions');
            return;
        }

        common.logging.info('Dropping table: members_stripe_customers_subscriptions');
        return commands.deleteTable('members_stripe_customers_subscriptions', conn);
    }
};
