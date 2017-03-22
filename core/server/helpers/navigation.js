// ### Navigation Helper
// `{{navigation}}`
// Outputs navigation menu of static urls

var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString,
    i18n = proxy.i18n,
    errors = proxy.errors,
    templates = proxy.templates;

module.exports = function navigation(options) {
    var navigationData = options.data.blog.navigation,
        currentUrl = options.data.root.relativeUrl,
        self = this,
        output,
        data;

    if (!_.isObject(navigationData) || _.isFunction(navigationData)) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.navigation.invalidData')
        });
    }

    if (navigationData.filter(function (e) {
        return (_.isUndefined(e.label) || _.isUndefined(e.url));
    }).length > 0) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.navigation.valuesMustBeDefined')
        });
    }

    // check for non-null string values
    if (navigationData.filter(function (e) {
        return ((!_.isNull(e.label) && !_.isString(e.label)) ||
            (!_.isNull(e.url) && !_.isString(e.url)));
    }).length > 0) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.navigation.valuesMustBeString')
        });
    }

    function _slugify(label) {
        return label.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
    }

    // strips trailing slashes and compares urls
    function _isCurrentUrl(href, currentUrl) {
        if (!currentUrl) {
            return false;
        }

        var strippedHref = href.replace(/\/+$/, ''),
            strippedCurrentUrl = currentUrl.replace(/\/+$/, '');
        return strippedHref === strippedCurrentUrl;
    }

    // {{navigation}} should no-op if no data passed in
    if (navigationData.length === 0) {
        return new SafeString('');
    }

    output = navigationData.map(function (e) {
        var out = {};
        out.current = _isCurrentUrl(e.url, currentUrl);
        out.label = e.label;
        out.slug = _slugify(e.label);
        out.url = e.url;
        out.secure = self.secure;
        return out;
    });

    data = _.merge({}, {navigation: output});

    return templates.execute('navigation', data, options);
};

