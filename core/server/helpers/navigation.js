// ### Navigation Helper
// `{{navigation}}`
// Outputs navigation menu of static urls

var _               = require('lodash'),
    hbs             = require('express-hbs'),
    i18n            = require('../i18n'),

    errors          = require('../errors'),
    template        = require('./template'),
    navigation;

navigation = function (options) {
    /*jshint unused:false*/
    var navigationData = options.data.blog.navigation,
        currentUrl = options.data.root.relativeUrl,
        self = this,
        output,
        context;

    if (!_.isObject(navigationData) || _.isFunction(navigationData)) {
        return errors.logAndThrowError(i18n.t('warnings.helpers.navigation.invalidData'));
    }

    if (navigationData.filter(function (e) {
        return (_.isUndefined(e.label) || _.isUndefined(e.url));
    }).length > 0) {
        return errors.logAndThrowError(i18n.t('warnings.helpers.navigation.valuesMustBeDefined'));
    }

    // check for non-null string values
    if (navigationData.filter(function (e) {
        return ((!_.isNull(e.label) && !_.isString(e.label)) ||
            (!_.isNull(e.url) && !_.isString(e.url)));
    }).length > 0) {
        return errors.logAndThrowError(i18n.t('warnings.helpers.navigation.valuesMustBeString'));
    }

    function _slugify(label) {
        return label.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
    }

    // strips trailing slashes and compares urls
    function _isCurrentUrl(href, currentUrl) {
        var strippedHref = href.replace(/\/+$/, ''),
            strippedCurrentUrl = currentUrl.replace(/\/+$/, '');
        return strippedHref === strippedCurrentUrl;
    }

    // {{navigation}} should no-op if no data passed in
    if (navigationData.length === 0) {
        return new hbs.SafeString('');
    }

    output = navigationData.map(function (e) {
        var out = {};
        out.current = _isCurrentUrl(e.url, currentUrl);
        out.label = e.label;
        out.slug = _slugify(e.label);
        out.url = hbs.handlebars.Utils.escapeExpression(e.url);
        out.secure = self.secure;
        return out;
    });

    context = _.merge({}, {navigation: output});

    return template.execute('navigation', context, options);
};

module.exports = navigation;
