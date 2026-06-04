// ### Navigation Helper
// `{{navigation}}`
// Outputs navigation menu of static urls
const {SafeString, templates, hbs} = require('../services/handlebars');

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const {slugify} = require('@tryghost/string');
const _ = require('lodash');

const messages = {
    invalidData: 'navigation data is not an object or is a function',
    valuesMustBeDefined: 'All values must be defined for label, url and current',
    valuesMustBeString: 'Invalid value, Url, Label and Icon must be strings',
    invalidVisibility: 'Invalid navigation visibility value'
};

const createFrame = hbs.handlebars.createFrame;
const visibilityValues = ['public', 'members', 'paid', 'public_free', 'public_paid', 'public_only', 'free_members', 'none'];

function getNavigationIconName(icon) {
    if (!icon) {
        return '';
    }

    const filename = icon.split(/[?#]/)[0].split('/').filter(Boolean).pop() || '';
    const name = filename.replace(/\.[^.]+$/, '');

    try {
        return decodeURIComponent(name);
    } catch (e) {
        return name;
    }
}

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
    const member = options.data.member || options.data.root.member;
    let output;

    if (!_.isObject(navigationData) || _.isFunction(navigationData)) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.invalidData)
        });
    }

    if (navigationData.filter(function (e) {
        return (_.isUndefined(e.url) || (_.isUndefined(e.label) && _.isUndefined(e.icon)));
    }).length > 0) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.valuesMustBeDefined)
        });
    }

    // check for non-null string values
    if (navigationData.filter(function (e) {
        return ((!_.isUndefined(e.label) && !_.isNull(e.label) && !_.isString(e.label)) ||
            (!_.isNull(e.url) && !_.isString(e.url)) ||
            (!_.isUndefined(e.icon) && !_.isNull(e.icon) && !_.isString(e.icon)));
    }).length > 0) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.valuesMustBeString)
        });
    }

    if (navigationData.filter(function (e) {
        return !_.isUndefined(e.visibility) && !visibilityValues.includes(e.visibility);
    }).length > 0) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.invalidVisibility)
        });
    }

    // strips trailing slashes and compares urls
    function _isCurrentUrl(href, url) {
        if (!url) {
            return false;
        }

        const strippedHref = href.replace(/\/+$/, '');
        const strippedCurrentUrl = url.replace(/\/+$/, '');
        return strippedHref === strippedCurrentUrl;
    }

    // {{navigation}} should no-op if no data passed in
    if (navigationData.length === 0) {
        return new SafeString('');
    }

    function _isVisible(item) {
        const visibility = item.visibility || 'public';
        const isMember = !!member;
        const isFreeMember = isMember && member.status === 'free';
        const isPaidMember = isMember && member.status !== 'free';

        if (visibility === 'members') {
            return isMember;
        }

        if (visibility === 'paid') {
            return isPaidMember;
        }

        if (visibility === 'public_free') {
            return !isMember || isFreeMember;
        }

        if (visibility === 'public_paid') {
            return !isMember || isPaidMember;
        }

        if (visibility === 'public_only') {
            return !isMember;
        }

        if (visibility === 'free_members') {
            return isFreeMember;
        }

        if (visibility === 'none') {
            return false;
        }

        return true;
    }

    output = navigationData.filter(_isVisible).map(function (e) {
        const out = {};
        const iconName = getNavigationIconName(e.icon);
        const hasLabel = _.isString(e.label) && e.label.trim().length > 0;

        out.current = _isCurrentUrl(e.url, currentUrl);
        out.icon = e.icon || null;
        out.iconAlt = hasLabel ? '' : iconName;
        out.label = e.label;
        out.slug = slugify(hasLabel ? e.label : iconName);
        out.url = e.url;
        return out;
    });

    if (output.length === 0) {
        return new SafeString('');
    }

    // CASE: The navigation helper should have access to the navigation items at the top level.
    this.navigation = output;
    // CASE: The navigation helper will forward attributes passed to it.
    _.merge(this, options.hash);
    const data = createFrame(options.data);

    return templates.execute('navigation', this, {data});
};
