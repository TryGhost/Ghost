const _ = require('lodash');

module.exports.findKey = function findKey(key /* ...objects... */) {
  const objects = Array.prototype.slice.call(arguments, 1);

  return _.reduceRight(
    objects,
    function (result, object) {
      if (object && _.has(object, key) && !_.isEmpty(object[key])) {
        result = object[key];
      }

      return result;
    },
    null,
  );
};

function _urlClean(url) {
  // Strips anchors and leading and trailing slashes
  return url.replace(/#.*?$/, '').replace(/^\/|\/$/g, '');
}

// strips trailing slashes and compares urls
function _urlMatch(href, location) {
  if (!location) {
    return false;
  }

  const strippedHref = _urlClean(href);
  const strippedLocation = _urlClean(location);

  return strippedHref === strippedLocation;
}

// We want to check if the first part of the current url is a match for href
function _urlParentMatch(href, location) {
  if (!location) {
    return false;
  }

  let parent = false;
  const locParts = _urlClean(location).split('/');
  const hrefParts = _urlClean(href).split('/');

  if (locParts.length <= hrefParts.length) {
    return false;
  }

  for (let i = 0; i < hrefParts.length; i += 1) {
    parent = hrefParts[i] === locParts[i];
  }

  return parent;
}

module.exports.buildLinkClasses = function buildLinkClasses(siteUrl, href, options) {
  const relativeHref = href.replace(siteUrl, '');
  const location = options.data.root.relativeUrl;
  const classes = options.hash.class ? options.hash.class.toString().split(' ') : [];
  const activeClass = _.has(options.hash, 'activeClass') ? options.hash.activeClass : 'nav-current';
  const parentActiveClass = _.has(options.hash, 'parentActiveClass')
    ? options.hash.parentActiveClass
    : `${activeClass || 'nav-current'}-parent`;

  // Calculate dynamic properties
  if (_urlMatch(relativeHref, location) && activeClass) {
    classes.push(activeClass);
  } else if (_urlParentMatch(relativeHref, location) && parentActiveClass) {
    classes.push(parentActiveClass);
  }

  return classes;
};
