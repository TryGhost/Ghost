module.exports = function setSrcsetAttribute(img, options) {
    if (!img || !['IMG', 'SOURCE'].includes(img.tagName) || !img.getAttribute('src')) {
        return;
    }

    const src = img.getAttribute('src');

    // apply srcset if this is a relative image that matches Ghost's image url structure
    if (options.contentImageSizes && /^\/.*\/?content\/images\//.test(src)) {
        const [, imagesPath, filename] = src.match(/(.*\/content\/images)\/(.*)/);
        const srcset = Object.values(options.contentImageSizes).map(({width}) => {
            return `${imagesPath}/size/w${width}/${filename} ${width}w`;
        }).join(', ');

        img.setAttribute('srcset', srcset);
    }

    // apply srcset if this is an Unsplash image
    if (options.contentImageSizes && /images\.unsplash\.com/.test(src)) {
        const unsplashUrl = new URL(src);
        const srcset = Object.values(options.contentImageSizes).map(({width}) => {
            unsplashUrl.searchParams.set('w', width);
            return `${unsplashUrl.href} ${width}w`;
        }).join(', ');

        img.setAttribute('srcset', srcset);
    }
};
