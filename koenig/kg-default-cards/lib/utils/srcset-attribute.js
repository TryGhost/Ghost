const isLocalContentImage = require('./is-local-content-image');
const getAvailableImageWidths = require('./get-available-image-widths');
const isUnsplashImage = require('./is-unsplash-image');

// default content sizes: [600, 1000, 1600, 2400]

const getSrcsetAttribute = function ({src, width, options}) {
    if (!options.imageOptimization || options.imageOptimization.srcsets === false || !width || !options.imageOptimization.contentImageSizes) {
        return;
    }

    if (isLocalContentImage(src, options.siteUrl) && options.canTransformImage && !options.canTransformImage(src)) {
        return;
    }

    const srcsetWidths = getAvailableImageWidths({width}, options.imageOptimization.contentImageSizes);

    // apply srcset if this is a relative image that matches Ghost's image url structure
    if (isLocalContentImage(src, options.siteUrl)) {
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
