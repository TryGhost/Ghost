const isLocalContentImage = require('./is-local-content-image');
const getAvailableImageWidths = require('./get-available-image-widths');
const isUnsplashImage = require('./is-unsplash-image');

// default content sizes: [600, 1000, 1600, 2400]

module.exports = function setSrcsetAttribute(elem, image, options) {
    if (!elem || !['IMG', 'SOURCE'].includes(elem.tagName) || !elem.getAttribute('src') || !image) {
        return;
    }

    if (!options.imageOptimization || options.imageOptimization.srcsets === false || !image.width || !options.imageOptimization.contentImageSizes) {
        return;
    }

    if (isLocalContentImage(image.src) && options.canTransformImage && !options.canTransformImage(image.src)) {
        return;
    }

    const srcsetWidths = getAvailableImageWidths(image, options.imageOptimization.contentImageSizes);

    // apply srcset if this is a relative image that matches Ghost's image url structure
    if (isLocalContentImage(image.src)) {
        const [, imagesPath, filename] = image.src.match(/(.*\/content\/images)\/(.*)/);
        const srcs = [];

        srcsetWidths.forEach((width) => {
            if (width === image.width) {
                // use original image path if width matches exactly (avoids 302s from size->original)
                srcs.push(`${image.src} ${width}w`);
            } else if (width <= image.width) {
                // avoid creating srcset sizes larger than intrinsic image width
                srcs.push(`${imagesPath}/size/w${width}/${filename} ${width}w`);
            }
        });

        if (srcs.length) {
            elem.setAttribute('srcset', srcs.join(', '));
        }
    }

    // apply srcset if this is an Unsplash image
    if (isUnsplashImage(image.src)) {
        const unsplashUrl = new URL(image.src);
        const srcs = [];

        srcsetWidths.forEach((width) => {
            unsplashUrl.searchParams.set('w', width);
            srcs.push(`${unsplashUrl.href} ${width}w`);
        });

        elem.setAttribute('srcset', srcs.join(', '));
    }
};
