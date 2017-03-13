var debug = require('ghost-ignition').debug('sync'),
    models = require('../models'),
    ghostAuth = require('./ghost-auth'),
    logging = require('../logging'),
    errors = require('../errors'),
    events = require('../events'),
    knex = require('../data/db').knex,
    _private = {
        syncIntervalInMs: 1000 * 60 * 60,
        lastSync: {}
    };

/**
 * @TODO: support long polling in the ghost auth service
 */
_private.syncUser = function syncUser(loggedInUserModel) {
    debug('syncUser');

    // CASE: sync every hour for now
    if (_private.lastSync[loggedInUserModel.id]) {
        if ((_private.lastSync[loggedInUserModel.id] + _private.syncIntervalInMs) > Date.now()) {
            debug('too early too sync');
            return;
        }
    }

    return ghostAuth.getUser({
        id: loggedInUserModel.get('ghost_auth_id')
    }).then(function (ghostUser) {
        debug('ghost_email', ghostUser.email);
        debug('user_email', loggedInUserModel.get('email'));

        if (ghostUser.email === loggedInUserModel.get('email')) {
            debug('email has not changed');
            return;
        }

        debug('sync email');

        // CASE: we update the user in a transaction to avoid collisions
        return knex.transaction(function onTransaction(transaction) {
            return models.User.edit({
                email: ghostUser.email
            }, {id: loggedInUserModel.id, transacting: transaction});
        });
    }).then(function () {
        debug('update lastSync');
        _private.lastSync[loggedInUserModel.id] = Date.now();
    }).catch(function onError(err) {
        logging.error(new errors.InternalServerError({
            message: 'ghost-auth: sync failed',
            err: err
        }));
    });
};

module.exports.init = function init(options) {
    var authType = options.authType;

    if (authType === 'ghost') {
        events.on('read:users:me', _private.syncUser);
    }
};
