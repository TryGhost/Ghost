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
                },
                ssr: {
                    exchangeTokenForSession: function () {
                        return Promise.reject(new common.errors.InternalServerError());
                    },
                    deleteSession: function () {
                        return Promise.reject(new common.errors.InternalServerError());
                    },
                    getMemberDataFromSession: function () {
                        return Promise.reject(new common.errors.InternalServerError());
                    }
                }
            };
        }
        return require('./api');
    },

    get authPages() {
        return require('./authPages');
    },

    get gateway() {
        return require('./api').staticRouter;
    }
};
