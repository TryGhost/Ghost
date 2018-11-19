// Usage:
// `{{img_url feature_image}}`
// `{{img_url profile_image absolute="true"}}`
// Note:
// `{{img_url}}` - does not work, argument is required
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

const path = require('path');
const proxy = require('./proxy');
const urlService = proxy.urlService;
const activeTheme = proxy.activeTheme;
const IMAGE_SIZES_CONFIG = 'image_sizes';
const STATIC_IMAGE_URL_PREFIX = `/${urlService.utils.STATIC_IMAGE_URL_PREFIX}`;

module.exports = function imgUrl(attr, options) {
    // CASE: if no attribute is passed, e.g. `{{img_url}}` we show a warning
    if (arguments.length < 2) {
        proxy.logging.warn(proxy.i18n.t('warnings.helpers.img_url.attrIsRequired'));
        return;
    }

    const absolute = options && options.hash && options.hash.absolute;

    const image = getImageWithSize(attr, options && options.hash && options.hash.size);

    // CASE: if attribute is passed, but it is undefined, then the attribute was
    // an unknown value, e.g. {{img_url feature_img}} and we also show a warning
    if (image === undefined) {
        proxy.logging.warn(proxy.i18n.t('warnings.helpers.img_url.attrIsRequired'));
        return;
    }

    if (image) {
        return urlService.utils.urlFor('image', {image}, absolute);
    }

    // CASE: if you pass e.g. cover_image, but it is not set, then attr is null!
    // in this case we don't show a warning
};

function getImageWithSize(imagePath, requestedSize) {
    if (!imagePath) {
        return imagePath;
    }
    if (!requestedSize) {
        return imagePath;
    }

    const themeImageSizes = activeTheme.get().config(IMAGE_SIZES_CONFIG);

    if (!themeImageSizes || !themeImageSizes[requestedSize]) {
        return imagePath;
    }

    const imageName = path.relative(STATIC_IMAGE_URL_PREFIX, imagePath);

    return path.join(STATIC_IMAGE_URL_PREFIX, `/sizes/${requestedSize}/`, imageName);
}
