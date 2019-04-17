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
                    exchangeTokenForSession: function (req, res) {
                        return Promise.reject(new common.errors.InternalServerError());
                    },
                    deleteSession: function (req, res) {
                        return Promise.reject(new common.errors.InternalServerError());
                    },
                    getMemberDataFromSession: function (req, res) {
                        return Promise.reject(new common.errors.InternalServerError());
                    }
                }
            };
        }
        return require('./api');
    }
};
