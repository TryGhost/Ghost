const logging = require('@tryghost/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        logging.info('Updating members_reply_address setting to members group');
        await knex('settings')
            .update({
                group: 'members'
            })
            .where({
                key: 'members_reply_address'
            });
    },

    async down() {}
};
