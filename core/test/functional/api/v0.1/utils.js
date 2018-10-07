const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../utils');
const API_URL = '/ghost/api/v0.1/';

module.exports = {
    API: {
        getApiQuery(route) {
            return url.resolve(API_URL, route);
        }
    },

    doAuth() {
        const args = Array.prototype.slice.call(arguments);
        args.unshift(`${API_URL}authentication/token/`);
        return testUtils.API.doAuth.apply(null, args);
    }
};
