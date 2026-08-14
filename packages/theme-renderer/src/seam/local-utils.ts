/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/theme-engine/handlebars/utils.js @ 407e032dc7
// — transforms: CJS → ESM.
import _ from '../utils/lodash.ts';

export function findKey(key: string, ...objects: any[]): any {
    return _.reduceRight(objects, function (result: any, object: any) {
        if (object && _.has(object, key) && !_.isEmpty(object[key])) {
            result = object[key];
        }

        return result;
    }, null);
}

function _urlClean(url: string) {
    // Strips anchors and leading and trailing slashes
    return url.replace(/#.*?$/, '').replace(/^\/|\/$/g, '');
}

// strips trailing slashes and compares urls
function _urlMatch(href: string, location: string) {
    if (!location) {
        return false;
    }

    const strippedHref = _urlClean(href);
    const strippedLocation = _urlClean(location);

    return strippedHref === strippedLocation;
}

// We want to check if the first part of the current url is a match for href
function _urlParentMatch(href: string, location: string) {
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

export function buildLinkClasses(siteUrl: string, href: string, options: any): string[] {
    const relativeHref = href.replace(siteUrl, '');
    const location = options.data.root.relativeUrl;
    const classes = options.hash.class ? options.hash.class.toString().split(' ') : [];
    const activeClass = _.has(options.hash, 'activeClass') ? options.hash.activeClass : 'nav-current';
    const parentActiveClass = _.has(options.hash, 'parentActiveClass') ? options.hash.parentActiveClass : `${activeClass || 'nav-current'}-parent`;

    // Calculate dynamic properties
    if (_urlMatch(relativeHref, location) && activeClass) {
        classes.push(activeClass);
    } else if (_urlParentMatch(relativeHref, location) && parentActiveClass) {
        classes.push(parentActiveClass);
    }

    return classes;
}
