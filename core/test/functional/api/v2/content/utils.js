const url = require('url');
const _ = require('lodash');
const API_URL = '/ghost/api/v2/content/';

module.exports = {
    API: {
        getApiQuery(route) {
            return url.resolve(API_URL, route);
        }
    },
    getValidKey() {
        return _.repeat('c', 128);
    }
};
