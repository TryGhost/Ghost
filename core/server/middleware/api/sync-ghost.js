var debug = require('ghost-ignition').debug('sync'),
    models = require('../../models'),
    auth = require('../../auth'),
    logging = require('../../logging'),
    errors = require('../../errors'),
    knex = require('../../data/db').knex,
    _private = {
        syncIntervalInMs: 1000 * 60 * 60,
        lastSync: null
    };

/**
 * We had two options: sync in background or foreground (block the request)
 * - as i would like to add long polling, it doesn't make sense to sync in foreground at all
 * - both for background and foreground, it can happen that ember has old data and the email get's overridden again
 * - e.g. foreground: you have two tabs open, you refresh one, but the other tab has the old email
 * - see https://github.com/TryGhost/Ghost/issues/5599, but this add-on will prevent!
 * - foreground has another disadvantage: if the request to ghost auth timeouts, the fetch user request is blocked
 *
 * @TODO: support long polling in the ghost auth service
 */
_private.sync = function sync(options) {
    var loggedInUserId = options.loggedInUserId,
        loggedInUser;

    // CASE: sync every hour for now
    if (_private.lastSync) {
        if ((_private.lastSync + _private.syncIntervalInMs) > Date.now()) {
            return;
        }
    }

    models.User.findOne({id: loggedInUserId})
        .then(function onUser(_user) {
            loggedInUser = _user;

            if (!loggedInUser) {
                throw new errors.NotFoundError({
                    message: 'User not found',
                    help: 'user_id: ' + loggedInUserId
                });
            }

            return auth.ghostAuth.getUser({
                token: loggedInUser.get('ghost_auth_access_token')
            });
        })
        .then(function (ghostUser) {
            debug('ghost_email', ghostUser.email);
            debug('user_email', loggedInUser.get('email'));

            if (ghostUser.email === loggedInUser.get('email')) {
                return;
            }

            // CASE: we update the user in a transaction to avoid collisions
            return knex.transaction(function onTransaction(transaction) {
                return models.User.edit({
                    email: ghostUser.email
                }, {id: loggedInUser.id, transacting: transaction});
            });
        })
        .then(function () {
            _private.lastSync = Date.now();
        })
        .catch(function onError(err) {
            err.level = 'critical';
            logging.error(err);
        });
};

module.exports = function ghostSync(req, res, next) {
    if (!req.isGhostAuth) {
        return next();
    }

    res.once('finish', function onFinish() {
        // CASE: do nothing if error occurs
        if (req.err) {
            return;
        }

        _private.sync({loggedInUserId: req.user.id});
    });

    next();
};
