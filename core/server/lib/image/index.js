module.exports = {
    get blogIcon() {
        return require('./blog-icon');
    },

    get imageSize() {
        return require('./image-size');
    },

    get gravatar() {
        return require('./gravatar');
    },

    get imageSizeCache() {
        return require('./cached-image-size-from-url');
    }
};
