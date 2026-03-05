const _ = require('lodash');
const logging = require('@tryghost/logging');
const {getImageWithSize} = require('../utils/images');
const config = require('../../shared/config');
const imageSizeCache = require('../../server/lib/image').cachedImageSizeFromUrl;

/**
 * Get Image dimensions
 * @param {object} metaData
 * @returns {Promise<object>} metaData
 * @description for image properties in meta data (coverImage, authorImage and site.logo), `getCachedImageSizeFromUrl` is
 * called to receive image width and height
 */
async function getImageDimensions(metaData) {
    const MAX_SOCIAL_IMG_WIDTH = config.get('imageOptimization:internalImageSizes:social-image:width') || 1200;

    console.log('[IMAGE-CDN-TEST] getImageDimensions called', {coverImage: metaData.coverImage.url, authorImage: metaData.authorImage.url, ogImage: metaData.ogImage.url, twitterImage: metaData.twitterImage, logo: metaData.site.logo.url});
    logging.info('[IMAGE-CDN-TEST] getImageDimensions called ' + JSON.stringify({coverImage: metaData.coverImage.url, authorImage: metaData.authorImage.url, ogImage: metaData.ogImage.url, twitterImage: metaData.twitterImage, logo: metaData.site.logo.url}));

    const fetch = {
        coverImage: imageSizeCache.getCachedImageSizeFromUrl(metaData.coverImage.url),
        authorImage: imageSizeCache.getCachedImageSizeFromUrl(metaData.authorImage.url),
        ogImage: imageSizeCache.getCachedImageSizeFromUrl(metaData.ogImage.url),
        twitterImage: imageSizeCache.getCachedImageSizeFromUrl(metaData.twitterImage),
        logo: imageSizeCache.getCachedImageSizeFromUrl(metaData.site.logo.url)
    };

    const [coverImage, authorImage, ogImage, twitterImage, logo] = await Promise.all([
        fetch.coverImage,
        fetch.authorImage,
        fetch.ogImage,
        fetch.twitterImage,
        fetch.logo
    ]);
    const imageObj = {
        coverImage,
        authorImage,
        ogImage,
        twitterImage,
        logo
    };

    console.log('[IMAGE-CDN-TEST] getImageDimensions results', JSON.stringify({coverImage, authorImage, ogImage, twitterImage, logo}));
    logging.info('[IMAGE-CDN-TEST] getImageDimensions results ' + JSON.stringify({coverImage, authorImage, ogImage, twitterImage, logo}));

    _.forEach(imageObj, function (key, value) {
        if (_.has(key, 'width') && _.has(key, 'height')) {
            // We have some restrictions for publisher.logo:
            // The image needs to be <=600px wide and <=60px high (ideally exactly 600px x 60px).
            // Unless we have proper image-handling (see https://github.com/TryGhost/Ghost/issues/4453),
            // we will fake it in some cases or not produce an imageObject at all.
            if (value === 'logo') {
                if (key.height <= 60 && key.width <= 600) {
                    _.assign(metaData.site[value], {
                        dimensions: {
                            width: key.width,
                            height: key.height
                        }
                    });
                } else if (key.width === key.height) {
                    // CASE: the logo is too large, but it is a square. We fake it...
                    _.assign(metaData.site[value], {
                        dimensions: {
                            width: 60,
                            height: 60
                        }
                    });
                }
            } else {
                if (key.width > MAX_SOCIAL_IMG_WIDTH) {
                    console.log('[IMAGE-CDN-TEST] getImageDimensions -> social-image resize triggered', {field: value, originalWidth: key.width});
                    logging.info('[IMAGE-CDN-TEST] getImageDimensions -> social-image resize triggered ' + JSON.stringify({field: value, originalWidth: key.width}));
                    const ratio = key.height / key.width;
                    key.width = MAX_SOCIAL_IMG_WIDTH;
                    key.height = Math.round(MAX_SOCIAL_IMG_WIDTH * ratio);

                    const sizeOptions = {
                        requestedSize: `social-image`,
                        imageSizes: config.get('imageOptimization:internalImageSizes')
                    };

                    if (typeof metaData[value] === 'string') {
                        const url = getImageWithSize(metaData[value], sizeOptions);
                        console.log('[IMAGE-CDN-TEST] getImageDimensions -> social-image resized URL', {field: value, newUrl: url});
                        logging.info('[IMAGE-CDN-TEST] getImageDimensions -> social-image resized URL ' + JSON.stringify({field: value, newUrl: url}));
                        metaData[value] = url;
                    } else {
                        const url = getImageWithSize(metaData[value].url, sizeOptions);
                        console.log('[IMAGE-CDN-TEST] getImageDimensions -> social-image resized URL', {field: value, newUrl: url});
                        logging.info('[IMAGE-CDN-TEST] getImageDimensions -> social-image resized URL ' + JSON.stringify({field: value, newUrl: url}));
                        _.assign(metaData[value], {url});
                    }
                }

                if (typeof metaData[value] === 'object') {
                    _.assign(metaData[value], {
                        dimensions: {
                            width: key.width,
                            height: key.height
                        }
                    });
                }
            }
        }
    });

    return metaData;
}

module.exports = getImageDimensions;
