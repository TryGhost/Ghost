module.exports = {
    // @TODO: expose files/units and not functions of units
    get createSession() {
        return require('./middleware').createSession;
    },

    get destroySession() {
        return require('./middleware').destroySession;
    },

    get authenticate() {
        return require('./middleware').authenticate;
    }
};
