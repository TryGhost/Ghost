module.exports = {
    get renderEntries() {
        return require('./render-entries');
    },

    get formatResponse() {
        return require('./format-response');
    },

    get renderEntry() {
        return require('./render-entry');
    },

    get renderer() {
        return require('./renderer');
    },

    get templates() {
        return require('./templates');
    },

    get handleError() {
        return require('./error');
    },

    get context() {
        return require('./context');
    }
};
