const config = require('../../config/index.js');
const common = require('../../lib/common');

module.exports = {
    get api() {
        if (!config.get('enableDeveloperExperiments')) {
            return {
                apiRouter: function (req, res, next) {
                    return next(new common.errors.NotFoundError());
                },
                staticRouter: function (req, res, next) {
                    return next(new common.errors.NotFoundError());
                }
            };
        }
        return require('./api');
    }
};
