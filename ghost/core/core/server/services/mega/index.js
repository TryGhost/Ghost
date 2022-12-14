module.exports = {
    get mega() {
        return require('./mega');
    },

    get postEmailSerializer() {
        return require('./post-email-serializer');
    },

    get EmailPreview() {
        return require('./email-preview');
    }
};

