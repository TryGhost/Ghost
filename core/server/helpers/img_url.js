
// Usage:
// `{{img_url}}` - does not work, argument is required
// `{{img_url feature_image}}`
// `{{img_url profile_image absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

var proxy = require('./proxy'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    url = proxy.url;

module.exports = function imgUrl(attr, options) {
    var absolute;

    // CASE: if you pass e.g. cover_image, but it is not set, then attr is null!
    //       in this case we don't throw an error
    if (!options) {
        attr = undefined;
        options = attr;
    }

    absolute = options && options.hash && options.hash.absolute;

    if (attr === undefined) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.img_url.attrIsRequired')
        });
    }

    // CASE: property is not set in the model e.g. cover_image
    if (attr === null) {
        return;
    }

    return url.urlFor('image', {image: attr}, absolute);
};
