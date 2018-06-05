// Usage:
// `{{img_url feature_image}}`
// `{{img_url profile_image absolute="true"}}`
// Note:
// `{{img_url}}` - does not work, argument is required
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

var proxy = require('./proxy'),
    urlService = proxy.urlService;

module.exports = function imgUrl(attr, options) {
    // CASE: if no attribute is passed, e.g. `{{img_url}}` we show a warning
    if (arguments.length < 2) {
        proxy.logging.warn(proxy.i18n.t('warnings.helpers.img_url.attrIsRequired'));
        return;
    }

    var absolute = options && options.hash && options.hash.absolute;

    // CASE: if attribute is passed, but it is undefined, then the attribute was
    // an unknown value, e.g. {{img_url feature_img}} and we also show a warning
    if (attr === undefined) {
        proxy.logging.warn(proxy.i18n.t('warnings.helpers.img_url.attrIsRequired'));
        return;
    }

    if (attr) {
        return urlService.utils.urlFor('image', {image: attr}, absolute);
    }

    // CASE: if you pass e.g. cover_image, but it is not set, then attr is null!
    // in this case we don't show a warning
};
