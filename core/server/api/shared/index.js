module.exports = {
    get headers() {
        return require('./headers');
    },

    get http() {
        return require('./http');
    },

    get Options() {
        return require('./options');
    },

    get pipeline() {
        return require('./pipeline');
    },

    get validators() {
        return require('./validators');
    },

    get serializers() {
        return require('./serializers');
    }
};
