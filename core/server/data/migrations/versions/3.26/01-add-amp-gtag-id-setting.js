const logging = require('@tryghost/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        logging.info('Updating amp_gtag_id setting to amp group');
        await knex('settings')
            .update({
                group: 'amp'
            })
            .where({
                key: 'amp_gtag_id'
            });
    },

    async down() {}
};
