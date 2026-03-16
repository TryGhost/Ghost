module.exports = {
    dedent: require('./dedent'),
    getAvailableImageWidths: require('./get-available-image-widths'),
    hbs: require('./hbs'),
    isLocalContentImage: require('./is-local-content-image'),
    isUnsplashImage: require('./is-unsplash-image'),
    resizeImage: require('./resize-image'),
    generateImgAttrs: require('./generate-img-attrs'),
    ...require('./srcset-attribute') // get/setSrcsetAttribute
};
