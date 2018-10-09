const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const API_URL = '/ghost/api/v2/admin/';

module.exports = {
    API: {
        getApiQuery(route) {
            return url.resolve(API_URL, route);
        }
    },

    doAuth(...args) {
        return testUtils.API.doAuth(`${API_URL}session/`, ...args);
    }
};
