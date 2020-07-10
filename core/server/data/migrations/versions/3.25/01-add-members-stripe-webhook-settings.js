const logging = require('../../../../../shared/logging');
module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        logging.info('Updating members_stripe_webhook_id & members_stripe_webhook_secret settings to group: core, type: string, flags: null');
        await knex('settings')
            .update({
                group: 'core',
                type: 'string',
                flags: null
            })
            .whereIn('key', [
                'members_stripe_webhook_id',
                'members_stripe_webhook_secret'
            ]);
    },

    async down() {}
};
