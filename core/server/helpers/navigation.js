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
    var navigation,
        context,
        currentUrl = this.relativeUrl;

    if (!_.isObject(this.navigation) || _.isFunction(this.navigation)) {
        return errors.logAndThrowError('navigation data is not an object or is a function');
    }

    if (this.navigation.filter(function (e) {
        return (_.isUndefined(e.label) || _.isUndefined(e.url));
    }).length > 0) {
        return errors.logAndThrowError('All values must be defined for label, url and current');
    }

    // check for non-null string values
    if (this.navigation.filter(function (e) {
        return ((!_.isNull(e.label) && !_.isString(e.label)) ||
            (!_.isNull(e.url) && !_.isString(e.url)));
    }).length > 0) {
        return errors.logAndThrowError('Invalid value, Url and Label must be strings');
    }

    function _slugify(label) {
        return label.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
    }

    // {{navigation}} should no-op if no data passed in
    if (this.navigation.length === 0) {
        return new hbs.SafeString('');
    }

    navigation = this.navigation.map(function (e) {
        var out = {};
        out.current = e.url === currentUrl;
        out.label = e.label;
        out.slug = _slugify(e.label);
        out.url = hbs.handlebars.Utils.escapeExpression(e.url);
        return out;
    });

    context = _.merge({}, {navigation: navigation});

    return template.execute('navigation', context);
};

module.exports = navigation;
