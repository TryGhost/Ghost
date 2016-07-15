var config = require(__dirname + '/../config'),
    errors = require(config.paths.corePath + '/server/errors');

module.exports = function (req, res, next) {
    if (config.maintenance.enabled) {
        return next(new errors.Maintenance());
    }

    next();
};
