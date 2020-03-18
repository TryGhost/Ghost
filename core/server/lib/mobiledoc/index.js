module.exports = {
    activate() {
        // needed by ghost
    },

    get cards() {
        return require('./cards');
    },

    get atoms() {
        return require('./atoms');
    },

    get renderers() {
        return require('./renderers');
    }
};
