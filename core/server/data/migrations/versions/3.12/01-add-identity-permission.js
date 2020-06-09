const ObjectId = require('bson-objectid');
const logging = require('../../../../../shared/logging');

module.exports.config = {
    transaction: true
};

module.exports.up = async (options) => {
    const connection = options.transacting;

    const existingIdentityPermission = await connection('permissions').where({
        action_type: 'read',
        object_type: 'identity'
    }).first();

    if (existingIdentityPermission) {
        logging.warn('Permission for read:identity already added');
        return;
    }

    logging.info('Adding permission for read:identity');

    const date = connection.raw('CURRENT_TIMESTAMP');

    await connection('permissions').insert({
        id: ObjectId.generate(),
        name: 'Read identities',
        action_type: 'read',
        object_type: 'identity',
        created_at: date,
        created_by: 1,
        updated_at: date,
        updated_by: 1
    });
};

module.exports.down = async (options) => {
    const connection = options.transacting;

    const existingIdentityPermission = await connection('permissions').where({
        action_type: 'read',
        object_type: 'identity'
    }).first();

    if (!existingIdentityPermission) {
        logging.warn('Permission for read:identity already removed');
        return;
    }

    logging.info('Removing permission for read:identity');

    await connection('permissions').where({
        action_type: 'read',
        object_type: 'identity'
    }).del();
};
