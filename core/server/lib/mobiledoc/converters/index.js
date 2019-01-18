module.exports = {
    get mobiledocConverter() {
        return require('./mobiledoc-converter');
    },

    get markdownConverter() {
        return require('./markdown-converter');
    },

    get htmlToMobiledocConverter() {
        return require('@tryghost/html-to-mobiledoc').toMobiledoc;
    }
};
