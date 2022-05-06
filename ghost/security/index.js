module.exports = {
    get url() {
        return require('./lib/url');
    },

    get tokens() {
        return require('./lib/tokens');
    },

    get string() {
        return require('./lib/string');
    },

    get identifier() {
        return require('./lib/identifier');
    },

    get password() {
        return require('./lib/password');
    },

    get secret() {
        return require('./lib/secret');
    }
};
