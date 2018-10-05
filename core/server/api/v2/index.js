const shared = require('../shared');
const localUtils = require('./utils');

module.exports = {
    get http() {
        return shared.http;
    },

    // @TODO: transform
    get session() {
        return require('./session');
    },

    get api_keys() {
        return shared.pipeline(require('./api-keys'), localUtils);
    },

    get pages() {
        return shared.pipeline(require('./pages'), localUtils);
    }
};
