module.exports = {
    get headers() {
        return require('./headers');
    },

    get http() {
        return require('./http');
    },

    get Frame() {
        return require('./Frame');
    },

    get pipeline() {
        return require('./pipeline');
    },

    get validators() {
        return require('./validators');
    },

    get serializers() {
        return require('./serializers');
    },

    get utils() {
        return require('./utils');
    }
};
