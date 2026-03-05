const url = require('url');
const imageTransform = require('@tryghost/image-transform');
const urlUtils = require('../../shared/url-utils');
const storageUtils = require('../../server/adapters/storage/utils');

module.exports.detectInternalImage = function detectInternalImage(requestedImageUrl) {
    const siteUrl = urlUtils.getSiteUrl();
    const isAbsoluteImage = /https?:\/\//.test(requestedImageUrl);
    const isAbsoluteInternalImage = isAbsoluteImage && (requestedImageUrl.startsWith(siteUrl) || storageUtils.isInternalImage(requestedImageUrl));

    // CASE: imagePath is a "protocol relative" url e.g. "//www.gravatar.com/ava..."
    //       by resolving the the imagePath relative to the blog url, we can then
    //       detect if the imagePath is external, or internal.
    const isRelativeInternalImage = !isAbsoluteImage && url.resolve(siteUrl, requestedImageUrl).startsWith(siteUrl);

    const result = isAbsoluteInternalImage || isRelativeInternalImage;
    console.log('[IMAGE-CDN-TEST] detectInternalImage', {requestedImageUrl, siteUrl, isAbsoluteInternalImage, isRelativeInternalImage, result});
    return result;
};

module.exports.detectUnsplashImage = function detectUnsplashImage(requestedImageUrl) {
    const isUnsplashImage = /images\.unsplash\.com/.test(requestedImageUrl);
    return isUnsplashImage;
};

module.exports.getUnsplashImage = function getUnsplashImage(imagePath, sizeOptions) {
    const parsedUrl = new URL(imagePath);
    const {requestedSize, imageSizes, requestedFormat} = sizeOptions;

    if (requestedFormat) {
        const supportedFormats = ['avif', 'gif', 'jpg', 'png', 'webp'];
        if (supportedFormats.includes(requestedFormat)) {
            parsedUrl.searchParams.set('fm', requestedFormat);
        } else if (requestedFormat === 'jpeg') {
            // Map to alias
            parsedUrl.searchParams.set('fm', 'jpg');
        }
    }

    if (!imageSizes || !imageSizes[requestedSize]) {
        return parsedUrl.toString();
    }

    const {width, height} = imageSizes[requestedSize];

    if (!width && !height) {
        return parsedUrl.toString();
    }

    parsedUrl.searchParams.delete('w');
    parsedUrl.searchParams.delete('h');

    if (width) {
        parsedUrl.searchParams.set('w', width);
    }
    if (height) {
        parsedUrl.searchParams.set('h', height);
    }
    return parsedUrl.toString();
};

/**
 *
 * @param {string} imagePath
 * @param {Object} sizeOptions
 * @param {string} sizeOptions.requestedSize
 * @param {Object[]} sizeOptions.imageSizes
 * @param {string} [sizeOptions.requestedFormat]
 * @returns
 */
module.exports.getImageWithSize = function getImageWithSize(imagePath, sizeOptions) {
    const hasLeadingSlash = imagePath[0] === '/';

    if (hasLeadingSlash) {
        return '/' + getImageWithSize(imagePath.slice(1), sizeOptions);
    }
    const {requestedSize, imageSizes, requestedFormat} = sizeOptions;

    if (!requestedSize) {
        return imagePath;
    }

    if (!imageSizes || !imageSizes[requestedSize]) {
        return imagePath;
    }

    const {width, height} = imageSizes[requestedSize];

    if (!width && !height) {
        return imagePath;
    }

    const [imgBlogUrl, imageName] = imagePath.split(urlUtils.STATIC_IMAGE_URL_PREFIX);

    const sizeDirectoryName = prefixIfPresent('w', width) + prefixIfPresent('h', height);
    const formatPrefix = requestedFormat && imageTransform.canTransformToFormat(requestedFormat) ? `/format/${requestedFormat}` : '';

    if (!imageName) {
        return imgBlogUrl;
    }

    const result = [imgBlogUrl, urlUtils.STATIC_IMAGE_URL_PREFIX, `/size/${sizeDirectoryName}`, formatPrefix, imageName].join('');
    console.log('[IMAGE-CDN-TEST] getImageWithSize', {imagePath, requestedSize, width, height, imgBlogUrl, imageName, result});
    return result;
};

function prefixIfPresent(prefix, string) {
    return string ? prefix + string : '';
}
