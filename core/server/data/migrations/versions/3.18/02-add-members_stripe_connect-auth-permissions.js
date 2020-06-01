const ObjectId = require('bson-objectid');
const logging = require('../../../../../shared/logging');

module.exports = {
    config: {
        transaction: true
    },
    async up(options) {
        const connection = options.transacting;

        const existingIdentityPermission = await connection('permissions').where({
            action_type: 'auth',
            object_type: 'members_stripe_connect'
        }).first();

        if (existingIdentityPermission) {
            logging.warn('Permission for auth:members_stripe_connect already added');
            return;
        }

        logging.info('Adding permission for auth:members_stripe_connect');

        const date = connection.raw('CURRENT_TIMESTAMP');

        await connection('permissions').insert({
            id: ObjectId.generate(),
            name: 'Auth Stripe Connect for Members',
            action_type: 'auth',
            object_type: 'members_stripe_connect',
            created_at: date,
            created_by: 1,
            updated_at: date,
            updated_by: 1
        });
    },
    async down(options) {
        const connection = options.transacting;

        const existingIdentityPermission = await connection('permissions').where({
            action_type: 'auth',
            object_type: 'members_stripe_connect'
        }).first();

        if (!existingIdentityPermission) {
            logging.warn('Permission for auth:members_stripe_connect already removed');
            return;
        }

        logging.info('Removing permission for auth:members_stripe_connect');

        await connection('permissions').where({
            action_type: 'auth',
            object_type: 'members_stripe_connect'
        }).del();
    }
};
