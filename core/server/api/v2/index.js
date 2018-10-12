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

    get pages() {
        return shared.pipeline(require('./pages'), localUtils);
    },

    get roles() {
        return shared.pipeline(require('./roles'), localUtils);
    },

    get slugs() {
        return shared.pipeline(require('./slugs'), localUtils);
    }
};
