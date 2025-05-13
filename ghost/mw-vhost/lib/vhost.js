// This a fork of expressjs/vhost with trust proxy support
/* eslint-disable */

/*!
 * vhost
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */


'use strict';

/**
 * Module exports.
 * @public
 */

module.exports = vhost;

/**
 * Module variables.
 * @private
 */

var ASTERISK_REGEXP = /\*/g;
var ASTERISK_REPLACE = '([^.]+)';
var END_ANCHORED_REGEXP = /(?:^|[^\\])(?:\\\\)*\$$/;
var ESCAPE_REGEXP = /([.+?^=!:${}()|[\]/\\])/g;
var ESCAPE_REPLACE = '\\$1';

/**
 * Create a vhost middleware.
 *
 * @param {string|RegExp} hostname
 * @param {function} handle
 * @return {import('express').RequestHandler}
 * @public
 */

function vhost(hostname, handle) {
    if (!hostname) {
        throw new TypeError('argument hostname is required');
    }

    if (!handle) {
        throw new TypeError('argument handle is required');
    }

    if (typeof handle !== 'function') {
        throw new TypeError('argument handle must be a function');
    }

    // create regular expression for hostname
    var regexp = hostregexp(hostname);

    return function vhost(req, res, next) {
        var vhostdata = vhostof(req, regexp);

        if (!vhostdata) {
            return next();
        }

        // populate
        req.vhost = vhostdata;

        // handle
        handle(req, res, next);
    };
}

/**
 * Get hostname of request.
 *
 * @param {object} req
 * @return {string}
 * @private
 */

function hostnameof(req) {
    var host =
        req.hostname || // express v4
        req.host || // express v3
        req.headers.host; // http

    if (!host) {
        return;
    }

    var offset = host[0] === '['
        ? host.indexOf(']') + 1
        : 0;
    var index = host.indexOf(':', offset);

    return index !== -1
        ? host.substring(0, index)
        : host;
}

/**
 * Determine if object is RegExp.
 *
 * @param {object} val
 * @return {boolean}
 * @private
 */

function isregexp(val) {
    return Object.prototype.toString.call(val) === '[object RegExp]';
}

/**
 * Generate RegExp for given hostname value.
 *
 * @param {string|RegExp} val
 * @private
 */

function hostregexp(val) {
    var source = !isregexp(val)
        ? String(val).replace(ESCAPE_REGEXP, ESCAPE_REPLACE).replace(ASTERISK_REGEXP, ASTERISK_REPLACE)
        : val.source;

    // force leading anchor matching
    if (source[0] !== '^') {
        source = '^' + source;
    }

    // force trailing anchor matching
    if (!END_ANCHORED_REGEXP.test(source)) {
        source += '$';
    }

    return new RegExp(source, 'i');
}

/**
 * Get the vhost data of the request for RegExp
 *
 * @param {object} req
 * @param {RegExp} regexp
 * @return {object}
 * @private
 */

function vhostof(req, regexp) {
    var host = req.headers.host;
    var hostname = hostnameof(req);

    if (!hostname) {
        return;
    }

    var match = regexp.exec(hostname);

    if (!match) {
        return;
    }

    var obj = Object.create(null);

    obj.host = host;
    obj.hostname = hostname;
    obj.length = match.length - 1;

    for (var i = 1; i < match.length; i++) {
        obj[i - 1] = match[i];
    }

    return obj;
}
