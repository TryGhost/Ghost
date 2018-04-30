module.exports = {
    get i18n() {
        return require('./i18n');
    },

    get events() {
        return require('./events');
    },

    get errors() {
        return require('./errors');
    },

    get logging() {
        return require('./logging');
    }
};
