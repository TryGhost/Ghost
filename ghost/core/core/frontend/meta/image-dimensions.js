const _ = require('lodash');
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
                    const ratio = key.height / key.width;
                    key.width = MAX_SOCIAL_IMG_WIDTH;
                    key.height = Math.round(MAX_SOCIAL_IMG_WIDTH * ratio);

                    const sizeOptions = {
                        requestedSize: `social-image`,
                        imageSizes: config.get('imageOptimization:internalImageSizes')
                    };

                    if (typeof metaData[value] === 'string') {
                        const url = getImageWithSize(metaData[value], sizeOptions);
                        metaData[value] = url;
                    } else {
                        const url = getImageWithSize(metaData[value].url, sizeOptions);
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
