var config      = require('../../config'),
    moment      = require('moment'),
    events      = require(config.paths.corePath + '/server/events'),
    models      = require(config.paths.corePath + '/server/models'),
    errors      = require(config.paths.corePath + '/server/errors');

/**
 * WHEN access token is created we will update last_login for user.
 */
events.on('token.added', function (tokenModel) {
    models.User.edit(
        {last_login: moment().utc()}, {id: tokenModel.get('user_id')}
    )
    .catch(function (err) {
        errors.logError(err);
    });
});
