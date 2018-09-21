module.exports = {
    get cors() {
        return require('./cors');
    },

    get spamPrevention() {
        return require('./spam-prevention');
    },

    get versionMatch() {
        return require('./version-match');
    }
};
