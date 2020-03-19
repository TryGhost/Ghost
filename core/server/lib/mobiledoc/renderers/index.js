module.exports = {
    get mobiledocHtmlRenderer() {
        return require('./mobiledoc-html-renderer');
    },

    get markdownHtmlRenderer() {
        return require('./markdown-html-renderer');
    }
};
