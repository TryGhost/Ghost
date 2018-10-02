const shared = require('../shared');

module.exports = {
    get http() {
        return shared.http;
    },

    get session() {
        return require('./session');
    }
};
