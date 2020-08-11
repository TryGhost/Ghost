module.exports = {
    get pipeline() {
        return require('./lib/pipeline');
    },

    get sequence() {
        return require('./lib/sequence');
    }
};
