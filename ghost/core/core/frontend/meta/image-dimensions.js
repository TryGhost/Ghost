const _ = require('lodash');
const imageSizeCache = require('../../server/lib/image').cachedImageSizeFromUrl;

/**
 * Get Image dimensions
 * @param {object} metaData
 * @returns {Promise<object>} metaData
 * @description for image properties in meta data (coverImage, authorImage and site.logo), `getCachedImageSizeFromUrl` is
 * called to receive image width and height
 */
async function getImageDimensions(metaData) {
    const fetch = {
        coverImage: imageSizeCache.getCachedImageSizeFromUrl(metaData.coverImage.url),
        authorImage: imageSizeCache.getCachedImageSizeFromUrl(metaData.authorImage.url),
        ogImage: imageSizeCache.getCachedImageSizeFromUrl(metaData.ogImage.url),
        logo: imageSizeCache.getCachedImageSizeFromUrl(metaData.site.logo.url)
    };

    const [coverImage, authorImage, ogImage, logo] = await Promise.all([
        fetch.coverImage,
        fetch.authorImage,
        fetch.ogImage,
        fetch.logo
    ]);
    const imageObj = {
        coverImage,
        authorImage,
        ogImage,
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
                _.assign(metaData[value], {
                    dimensions: {
                        width: key.width,
                        height: key.height
                    }
                });
            }
        }
    });

    return metaData;
}

module.exports = getImageDimensions;
