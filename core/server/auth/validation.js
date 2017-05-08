var Promise = require('bluebird'),
    models = require('../models'),
    errors = require('../errors');

/**
 * If the setup is completed and...
 * 1. the public client does exist, deny to switch to local
 * 2. the public client does not exist, deny to switch to remote
 *
 * See https://github.com/TryGhost/Ghost/issues/8342
 * Remote authentication is disabled right now.
 */
exports.validate = function validate(options) {
    var authType = options.authType;

    if (authType === 'ghost') {
        return Promise.reject(new errors.InternalServerError({
            code: 'AUTH_TYPE',
            message: 'Ghost doesn\'t support remote authentication at the moment.',
            help: 'Set `auth.type` to "password".'
        }));
    }

    return models.User.isSetup()
        .then(function (isSetup) {
            if (!isSetup) {
                return;
            }

            return models.Client.findOne({slug: 'ghost-auth'}, {columns: 'id'})
                .then(function (client) {
                    if ((client && authType === 'password') || !client && authType === 'ghost') {
                        return Promise.reject(new errors.InternalServerError({
                            code: 'AUTH_SWITCH',
                            message: 'Switching the auth strategy is not allowed.',
                            context: 'Please reset your database and start from scratch.',
                            help: 'NODE_ENV=production|development knex-migrator reset && NODE_ENV=production|development knex-migrator init\n'
                        }));
                    }
                });
        });
};
