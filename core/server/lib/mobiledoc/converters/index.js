module.exports = {
    get mobiledocConverter() {
        return require('./mobiledoc-converter');
    },

    get markdownConverter() {
        return require('./markdown-converter');
    }
};
