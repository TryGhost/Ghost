// ### Navigation Helper
// `{{navigation}}`
// Outputs navigation menu of static urls

const {SafeString, i18n, errors, templates, hbs} = require('../services/proxy');
const {slugify} = require('@tryghost/string');
const _ = require('lodash');
const createFrame = hbs.handlebars.createFrame;

module.exports = function navigation(options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    const key = options.hash.type && options.hash.type === 'secondary' ? 'secondary_navigation' : 'navigation';
    // Set isSecondary so we can compare in the template
    options.hash.isSecondary = !!(options.hash.type && options.hash.type === 'secondary');
    // Remove type, so it's not accessible
    delete options.hash.type;

    const navigationData = options.data.site[key];
    const currentUrl = options.data.root.relativeUrl;
    const self = this;
    let output;

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

    // strips trailing slashes and compares urls
    function _isCurrentUrl(href, currentUrl) {
        if (!currentUrl) {
            return false;
        }

        const strippedHref = href.replace(/\/+$/, '');
        const strippedCurrentUrl = currentUrl.replace(/\/+$/, '');
        return strippedHref === strippedCurrentUrl;
    }

    // {{navigation}} should no-op if no data passed in
    if (navigationData.length === 0) {
        return new SafeString('');
    }

    output = navigationData.map(function (e) {
        const out = {};
        out.current = _isCurrentUrl(e.url, currentUrl);
        out.label = e.label;
        out.slug = slugify(e.label);
        out.url = e.url;
        out.secure = self.secure;
        return out;
    });

    // CASE: The navigation helper should have access to the navigation items at the top level.
    this.navigation = output;
    // CASE: The navigation helper will forward attributes passed to it.
    _.merge(this, options.hash);
    const data = createFrame(options.data);

    return templates.execute('navigation', this, {data});
};
