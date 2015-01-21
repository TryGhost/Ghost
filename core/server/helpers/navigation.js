// ### Navigation Helper
// `{{navigation}}`
// Outputs navigation menu of static urls

var _               = require('lodash'),
    hbs             = require('express-hbs'),
    errors          = require('../errors'),
    template        = require('./template'),
    navigation;

navigation = function (options) {
    /*jshint unused:false*/
    var nav,
        context,
        currentUrl = this.relativeUrl;

    if (!_.isObject(this.nav) || _.isFunction(this.nav)) {
        return errors.logAndThrowError('navigation data is not an object or is a function');
    }

    if (this.nav.filter(function (e) {
            return (_.isUndefined(e.label) || _.isUndefined(e.url));
        }).length > 0) {
            return errors.logAndThrowError('All values must be defined for label, url and current');
        }

    // check for non-null string values
    if (this.nav.filter(function (e) {
        return ((!_.isNull(e.label) && !_.isString(e.label)) ||
            (!_.isNull(e.url) && !_.isString(e.url)));
    }).length > 0) {
        return errors.logAndThrowError('Invalid value, Url and Label must be strings');
    }

    function _slugify(label) {
        return label.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
    }

    // {{navigation}} should no-op if no data passed in
    if (this.nav.length === 0) {
        return new hbs.SafeString('');
    }

    nav = this.nav.map(function (e) {
        var out = {};
        out.current = e.url === currentUrl;
        out.label = e.label;
        out.slug = _slugify(e.label);
        out.url = hbs.handlebars.Utils.escapeExpression(e.url);
        return out;
    });

    context = _.merge({}, {nav: nav});

    return template.execute('navigation', context);
};

module.exports = navigation;
