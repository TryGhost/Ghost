const logging = require('../../../../../shared/logging');
module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        logging.info('Updating routes_hash to group: core, type: string, flags: null');

        await knex('settings')
            .update({
                group: 'core',
                type: 'string',
                flags: null
            })
            .where('key', 'routes_hash');
    },

    async down() {}
};
