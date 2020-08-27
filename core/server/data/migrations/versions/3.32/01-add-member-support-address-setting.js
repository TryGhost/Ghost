const logging = require('../../../../../shared/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        const fromAddressSetting = await knex('settings')
            .select('value')
            .where('key', 'members_from_address')
            .first();
        const fromAddressValue = fromAddressSetting ? fromAddressSetting.value : 'noreply';
        logging.info(`Updating members_support_address setting to members group with value ${fromAddressValue}`);
        await knex('settings')
            .update({
                group: 'members',
                flags: 'PUBLIC,RO',
                value: fromAddressValue
            })
            .where({
                key: 'members_support_address'
            });
    },

    async down() {}
};
