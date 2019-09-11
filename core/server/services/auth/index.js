module.exports = {
    get authorize() {
        return require('./authorize');
    },

    get authenticate() {
        return require('./authenticate');
    },

    get session() {
        return require('./session');
    },

    get setup() {
        return require('./setup');
    },

    get passwordreset() {
        return require('./passwordreset');
    }
};
