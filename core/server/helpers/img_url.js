// Usage:
// `{{img_url feature_image}}`
// `{{img_url profile_image absolute="true"}}`
// Note:
// `{{img_url}}` - does not work, argument is required
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

const url = require('url');
const proxy = require('./proxy');
const urlService = proxy.urlService;
const STATIC_IMAGE_URL_PREFIX = `/${urlService.utils.STATIC_IMAGE_URL_PREFIX}`;

module.exports = function imgUrl(attr, options) {
    // CASE: if no attribute is passed, e.g. `{{img_url}}` we show a warning
    if (arguments.length < 2) {
        proxy.logging.warn(proxy.i18n.t('warnings.helpers.img_url.attrIsRequired'));
        return;
    }

    // CASE: if attribute is passed, but it is undefined, then the attribute was
    // an unknown value, e.g. {{img_url feature_img}} and we also show a warning
    if (attr === undefined) {
        proxy.logging.warn(proxy.i18n.t('warnings.helpers.img_url.attrIsRequired'));
        return;
    }

    // CASE: if you pass e.g. cover_image, but it is not set, then attr is null!
    // in this case we don't show a warning
    if (attr === null) {
        return;
    }

    const isInternalImage = detectInternalImage(attr);
    const {requestedSize, imageSizes} = getImageSizeOptions(options);
    const absoluteUrlRequested = getAbsoluteOption(options);

    function maybeGetImageWithSize(image) {
        if (isInternalImage) {
            return getImageWithSize(image, requestedSize, imageSizes);
        }
        return image;
    }
    const image = maybeGetImageWithSize(attr);

    return urlService.utils.urlFor('image', {image}, absoluteUrlRequested);
};

function getAbsoluteOption(options) {
    const absoluteOption = options && options.hash && options.hash.absolute;

    return absoluteOption ? !!absoluteOption && absoluteOption !== 'false' : false;
}

function getImageSizeOptions(options) {
    const requestedSize = options && options.hash && options.hash.size;
    const imageSizes = options && options.data && options.data.config && options.data.config.image_sizes;

    return {
        requestedSize,
        imageSizes
    };
}

function detectInternalImage(requestedImageUrl) {
    const siteUrl = urlService.utils.getBlogUrl();
    const isAbsoluteImage = /https?:\/\//.test(requestedImageUrl);
    const isAbsoluteInternalImage = isAbsoluteImage && requestedImageUrl.startsWith(siteUrl);

    // CASE: imagePath is a "protocol relative" url e.g. "//www.gravatar.com/ava..."
    //       by resolving the the imagePath relative to the blog url, we can then
    //       detect if the imagePath is external, or internal.
    const isRelativeInternalImage = !isAbsoluteImage && url.resolve(siteUrl, requestedImageUrl).startsWith(siteUrl);

    return isAbsoluteInternalImage || isRelativeInternalImage;
}

function getImageWithSize(imagePath, requestedSize, imageSizes) {
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

    const [imgBlogUrl, imageName] = imagePath.split(STATIC_IMAGE_URL_PREFIX);

    const sizeDirectoryName = prefixIfPresent('w', width) + prefixIfPresent('h', height);

    return [imgBlogUrl, STATIC_IMAGE_URL_PREFIX, `/size/${sizeDirectoryName}`, imageName].join('');
}

function prefixIfPresent(prefix, string) {
    return string ? prefix + string : '';
}
