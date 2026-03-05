const {isContentImage} = require('./is-content-image');
const {getAvailableImageWidths} = require('./get-available-image-widths');
const {isUnsplashImage} = require('./is-unsplash-image');

// default content sizes: [600, 1000, 1600, 2400]

const getSrcsetAttribute = function ({src, width, options}) {
    console.log('[IMAGE-CDN-TEST] getSrcsetAttribute called', {src, width, siteUrl: options.siteUrl, imageBaseUrl: options.imageBaseUrl});
    if (!options.imageOptimization || options.imageOptimization.srcsets === false || !width || !options.imageOptimization.contentImageSizes) {
        return;
    }

    const _isContent = isContentImage(src, options.siteUrl, options.imageBaseUrl);
    const _canTransform = options.canTransformImage ? options.canTransformImage(src) : false;
    console.log('[IMAGE-CDN-TEST] getSrcsetAttribute -> checks', {src, isContent: _isContent, canTransform: _canTransform});

    if (_isContent && options.canTransformImage && !_canTransform) {
        return;
    }

    const srcsetWidths = getAvailableImageWidths({width}, options.imageOptimization.contentImageSizes);

    // apply srcset if this is a local or CDN image that matches Ghost's image url structure
    if (_isContent) {
        const [, imagesPath, filename] = src.match(/(.*\/content\/images)\/(.*)/);
        const srcs = [];

        srcsetWidths.forEach((srcsetWidth) => {
            if (srcsetWidth === width) {
                // use original image path if width matches exactly (avoids 302s from size->original)
                srcs.push(`${src} ${srcsetWidth}w`);
            } else if (srcsetWidth <= width) {
                // avoid creating srcset sizes larger than intrinsic image width
                srcs.push(`${imagesPath}/size/w${srcsetWidth}/${filename} ${srcsetWidth}w`);
            }
        });

        if (srcs.length) {
            console.log('[IMAGE-CDN-TEST] getSrcsetAttribute -> srcset built', {src, srcsetEntries: srcs.length, firstEntry: srcs[0]});
            return srcs.join(', ');
        }
    }

    // apply srcset if this is an Unsplash image
    if (isUnsplashImage(src)) {
        const unsplashUrl = new URL(src);
        const srcs = [];

        srcsetWidths.forEach((srcsetWidth) => {
            unsplashUrl.searchParams.set('w', srcsetWidth);
            srcs.push(`${unsplashUrl.href} ${srcsetWidth}w`);
        });

        return srcs.join(', ');
    }
};

const setSrcsetAttribute = function (elem, image, options) {
    if (!elem || !['IMG', 'SOURCE'].includes(elem.tagName) || !elem.getAttribute('src') || !image) {
        return;
    }

    const {src, width} = image;
    const srcset = getSrcsetAttribute({src, width, options});

    if (srcset) {
        elem.setAttribute('srcset', srcset);
    }
};

module.exports = {
    getSrcsetAttribute,
    setSrcsetAttribute
};
