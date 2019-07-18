// # link helper
const _ = require('lodash');
const {config, SafeString} = require('./proxy');

const managedAttributes = ['href', 'class', 'activeClass', 'parentActiveClass', 'tagName', 'nohref'];

function _getHref(hash) {
    let href = hash.href || '/';
    return href.string ? href.string : href;
}

function _clean(url) {
    // Strips anchors and leading and trailing slashes
    return url.replace(/#.*?$/, '').replace(/^\/|\/$/g, '');
}

// strips trailing slashes and compares urls
function _urlMatch(href, location) {
    if (!location) {
        return false;
    }

    const strippedHref = _clean(href);
    const strippedLocation = _clean(location);

    return strippedHref === strippedLocation;
}

// We want to check if the first part of the current url is a match for href
function _parentMatch(href, location) {
    if (!location) {
        return false;
    }

    let parent = false;
    let locParts = _clean(location).split('/');
    let hrefParts = _clean(href).split('/');

    if (locParts.length <= hrefParts.length) {
        return false;
    }

    for (let i = 0; i < hrefParts.length; i += 1) {
        parent = hrefParts[i] === locParts[i];
    }

    return parent;
}

function _formatAttrs(attributes) {
    let attributeString = '';
    Object.keys(attributes).forEach((key) => {
        let value = attributes[key];

        // @TODO handle non-string attributes?
        attributeString += `${key}="${value}"`;
    });

    return attributeString;
}

module.exports = function link(options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    let href = _getHref(options.hash);
    let location = options.data.root.relativeUrl;
    let tagName = options.hash.tagName || 'a';
    let activeClass = _.has(options.hash, 'activeClass') ? options.hash.activeClass : 'nav-current';
    let parentActiveClass = _.has(options.hash, 'parentActiveClass') ? options.hash.parentActiveClass : `${activeClass || 'nav-current'}-parent`;
    let classes = options.hash.class ? options.hash.class.toString().split(' ') : [];
    let noHref = _.has(options.hash, 'nohref') ? options.hash.nohref : false;

    // Remove all the attributes we don't want to do a one-to-one mapping of
    managedAttributes.forEach((attr) => {
        delete options.hash[attr];
    });

    // Setup our one-to-one mapping of attributes;
    let attributes = options.hash;

    // Calculate dynamic properties
    let relativeHref = href.replace(config.get('url'), '');
    if (_urlMatch(relativeHref, location) && activeClass) {
        classes.push(activeClass);
    } else if (_parentMatch(relativeHref, location) && parentActiveClass) {
        classes.push(parentActiveClass);
    }

    // Prepare output
    let classString = classes.length > 0 ? `class="${classes.join(' ')}"` : '';
    let hrefString = !noHref ? `href="${href}"` : '';
    let attributeString = _.size(attributes) > 0 ? _formatAttrs(attributes) : '';
    let openingTag = `<${tagName} ${classString} ${hrefString} ${attributeString}>`;
    let closingTag = `</${tagName}>`;
    // Clean up any extra spaces
    openingTag = openingTag.replace(/\s{2,}/g, ' ').replace(/\s>/, '>');

    return new SafeString(`${openingTag}${options.fn(this)}${closingTag}`);
};
