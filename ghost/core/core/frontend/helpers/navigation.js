// ### Navigation Helper
// `{{navigation}}`
// Outputs navigation menu of static urls
const { SafeString, templates, hbs } = require('../services/handlebars');

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const { slugify } = require('@tryghost/string');
const _ = require('lodash');
const labs = require('../../shared/labs');

const messages = {
  invalidData: 'navigation data is not an object or is a function',
  valuesMustBeDefined: 'All values must be defined for label, url and current',
  valuesMustBeString: 'Invalid value, Url and Label must be strings',
};

const createFrame = hbs.handlebars.createFrame;

/**
 * @typedef {Object} NavigationItem
 * @property {string} url
 * @property {string} [label]
 * @property {string} [icon]
 * @property {string} [visibility]
 */

/**
 * @typedef {Object} NavigationMember
 * @property {'free' | 'paid' | string} status
 */

/**
 * @param {string | null | undefined} icon
 * @returns {string}
 */
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

/**
 * @param {string} href
 * @param {string | undefined} url
 * @returns {boolean}
 */
function isCurrentNavigationUrl(href, url) {
  if (!url) {
    return false;
  }

  const strippedHref = href.replace(/\/+$/, '');
  const strippedCurrentUrl = url.replace(/\/+$/, '');
  return strippedHref === strippedCurrentUrl;
}

/**
 * @param {NavigationItem} item
 * @param {NavigationMember | null | undefined} member
 * @returns {boolean}
 */
function isNavigationItemVisible(item, member) {
  const visibility = item.visibility || 'public';
  const isMember = !!member;
  const isFreeMember = isMember && member.status === 'free';
  const isPaidMember = isMember && member.status !== 'free';

  switch (visibility) {
    case 'members':
      return isMember;
    case 'paid':
      return isPaidMember;
    case 'public_free':
      return !isMember || isFreeMember;
    case 'public_paid':
      return !isMember || isPaidMember;
    case 'public_only':
      return !isMember;
    case 'free_members':
      return isFreeMember;
    case 'none':
      return false;
    default:
      return true;
  }
}

module.exports = function navigation(options) {
  options = options || {};
  options.hash = options.hash || {};
  options.data = options.data || {};

  const key =
    options.hash.type && options.hash.type === 'secondary' ? 'secondary_navigation' : 'navigation';
  // Set isSecondary so we can compare in the template
  options.hash.isSecondary = !!(options.hash.type && options.hash.type === 'secondary');
  // Remove type, so it's not accessible
  delete options.hash.type;

  const navigationData = options.data.site[key];
  const currentUrl = options.data.root.relativeUrl;
  const member = options.data.member || options.data.root.member;
  let output;

  if (!Array.isArray(navigationData)) {
    throw new errors.IncorrectUsageError({
      message: tpl(messages.invalidData),
    });
  }

  if (
    navigationData.filter(function (e) {
      return _.isUndefined(e.url) || (_.isUndefined(e.label) && _.isUndefined(e.icon));
    }).length > 0
  ) {
    throw new errors.IncorrectUsageError({
      message: tpl(messages.valuesMustBeDefined),
    });
  }

  // check for non-null string values
  if (
    navigationData.filter(function (e) {
      return (
        (!_.isUndefined(e.label) && !_.isNull(e.label) && !_.isString(e.label)) ||
        _.isNull(e.url) ||
        !_.isString(e.url)
      );
    }).length > 0
  ) {
    throw new errors.IncorrectUsageError({
      message: tpl(messages.valuesMustBeString),
    });
  }

  // Icon and visibility are coerced rather than thrown on (see map below):
  // a bad icon is dropped and an unrecognised visibility falls back to public,
  // so malformed data can never 500 a whole site's front end.

  // {{navigation}} should no-op if no data passed in
  if (navigationData.length === 0) {
    return new SafeString('');
  }

  const navigationIconsEnabled = labs.isSet('navigationIcons');

  output = navigationData
    .filter((item) => (navigationIconsEnabled ? isNavigationItemVisible(item, member) : true))
    .map(function (e) {
      const out = {};
      const icon = navigationIconsEnabled && _.isString(e.icon) ? e.icon : null;
      const iconName = getNavigationIconName(icon);
      const hasLabel = _.isString(e.label) && e.label.trim().length > 0;

      out.current = isCurrentNavigationUrl(e.url, currentUrl);
      out.icon = icon || null;
      out.iconAlt = hasLabel ? '' : iconName;
      out.label = hasLabel ? e.label : null;
      out.slug = slugify(hasLabel ? e.label : iconName);
      out.url = e.url;
      return out;
    })
    // Nothing to render: an icon-only item with the icons flag off would be an empty link
    .filter((item) => item.icon || item.label);

  if (output.length === 0) {
    return new SafeString('');
  }

  // CASE: The navigation helper should have access to the navigation items at the top level.
  this.navigation = output;
  // CASE: The navigation helper will forward attributes passed to it.
  _.merge(this, options.hash);
  const data = createFrame(options.data);
  // The template only wraps labels/renders icons when the flag is on, so pre-flag markup is unchanged
  data.navigationIcons = navigationIconsEnabled;

  return templates.execute('navigation', this, { data });
};
