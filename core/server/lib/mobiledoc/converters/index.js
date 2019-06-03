const common = require('../../common');

module.exports = {
    get mobiledocConverter() {
        return require('./mobiledoc-converter');
    },

    get markdownConverter() {
        return require('./markdown-converter');
    },

    get htmlToMobiledocConverter() {
        try {
            return require('@tryghost/html-to-mobiledoc').toMobiledoc;
        } catch (err) {
            return () => {
                throw new common.errors.InternalServerError({
                    message: 'Unable to convert from source HTML to Mobiledoc',
                    context: 'The html-to-mobiledoc package was not installed',
                    help: 'Please review any errors from the install process by checking the Ghost logs',
                    code: 'HTML_TO_MOBILEDOC_INSTALLATION',
                    err: err
                });
            };
        }
    }
};
