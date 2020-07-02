// default content sizes: [600, 1000, 1600, 2400]

module.exports = function setSrcsetAttribute(elem, image, options) {
    if (!elem || !['IMG', 'SOURCE'].includes(elem.tagName) || !elem.getAttribute('src') || !image) {
        return;
    }

    if (options.srcsets === false || !image.width || !options.contentImageSizes) {
        return;
    }

    const isLocalContentImage = /^\/.*\/?content\/images\//.test(image.src);
    if (isLocalContentImage && options.canTransformImage && !options.canTransformImage(image.src)) {
        return;
    }

    // get a sorted list of the available responsive widths
    const responsiveWidths = Object.values(options.contentImageSizes)
        .map(({width}) => width)
        .sort((a, b) => a - b);

    // select responsive widths that are usable based on the image width
    const srcsetWidths = responsiveWidths
        .filter(width => width <= image.width);

    // add the original image size to the responsive list if it's not captured by largest responsive size
    // - we can't know the width/height of the original `src` image because we don't know if it was resized
    //   or not. Adding the original image to the responsive list ensures we're not showing smaller sized
    //   images than we need to be
    if (image.width > srcsetWidths[srcsetWidths.length - 1] && image.width < responsiveWidths[responsiveWidths.length - 1]) {
        srcsetWidths.push(image.width);
    }

    // apply srcset if this is a relative image that matches Ghost's image url structure
    if (isLocalContentImage) {
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
    if (/images\.unsplash\.com/.test(image.src)) {
        const unsplashUrl = new URL(image.src);
        const srcs = [];

        srcsetWidths.forEach((width) => {
            unsplashUrl.searchParams.set('w', width);
            srcs.push(`${unsplashUrl.href} ${width}w`);
        });

        elem.setAttribute('srcset', srcs.join(', '));
    }
};
