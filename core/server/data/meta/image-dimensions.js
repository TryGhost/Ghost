var getCachedImageSizeFromUrl = require('../../utils/cached-image-size-from-url'),
    Promise = require('bluebird'),
    _ = require('lodash');

/**
 * Get Image dimensions
 * @param {object} metaData
 * @returns {object} metaData
 * @description for image properties in meta data (coverImage, authorImage and blog.logo), `getCachedImageSizeFromUrl` is
 * called to receive image width and height
 */
function getImageDimensions(metaData) {
    var fetch = {
        coverImage: getCachedImageSizeFromUrl(metaData.coverImage.url),
        authorImage: getCachedImageSizeFromUrl(metaData.authorImage.url),
        ogImage: getCachedImageSizeFromUrl(metaData.ogImage.url),
        logo: getCachedImageSizeFromUrl(metaData.blog.logo.url)
    };

    return Promise
        .props(fetch)
        .then(function (imageObj) {
            _.forEach(imageObj, function (key, value) {
                if (_.has(key, 'width') && _.has(key, 'height')) {
                    // We have some restrictions for publisher.logo:
                    // The image needs to be <=600px wide and <=60px high (ideally exactly 600px x 60px).
                    // Unless we have proper image-handling (see https://github.com/TryGhost/Ghost/issues/4453),
                    // we will fake it in some cases or not produce an imageObject at all.
                    if (value === 'logo') {
                        if (key.height <= 60 && key.width <= 600) {
                            _.assign(metaData.blog[value], {
                                dimensions: {
                                    width: key.width,
                                    height: key.height
                                }
                            });
                        } else if (key.width === key.height) {
                            // CASE: the logo is too large, but it is a square. We fake it...
                            _.assign(metaData.blog[value], {
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
        });
}

module.exports = getImageDimensions;
