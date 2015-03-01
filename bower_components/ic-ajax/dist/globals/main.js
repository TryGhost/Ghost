!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),(f.ic||(f.ic={})).ajax=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
/*!
 * ic-ajax
 *
 * - (c) 2013 Instructure, Inc
 * - please see license at https://github.com/instructure/ic-ajax/blob/master/LICENSE
 * - inspired by discourse ajax: https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/mixins/ajax.js#L19
 */

var Ember = window.Ember["default"] || window.Ember;

/*
 * jQuery.ajax wrapper, supports the same signature except providing
 * `success` and `error` handlers will throw an error (use promises instead)
 * and it resolves only the response (no access to jqXHR or textStatus).
 */

function request() {
  return raw.apply(null, arguments).then(function(result) {
    return result.response;
  }, null, 'ic-ajax: unwrap raw ajax response');
}

exports.request = request;exports["default"] = request;

/*
 * Same as `ajax` except it resolves an object with `{response, textStatus,
 * jqXHR}`, useful if you need access to the jqXHR object for headers, etc.
 */

function raw() {
  return makePromise(parseArgs.apply(null, arguments));
}

exports.raw = raw;var __fixtures__ = {};
exports.__fixtures__ = __fixtures__;
/*
 * Defines a fixture that will be used instead of an actual ajax
 * request to a given url. This is useful for testing, allowing you to
 * stub out responses your application will send without requiring
 * libraries like sinon or mockjax, etc.
 *
 * For example:
 *
 *    defineFixture('/self', {
 *      response: { firstName: 'Ryan', lastName: 'Florence' },
 *      textStatus: 'success'
 *      jqXHR: {}
 *    });
 *
 * @param {String} url
 * @param {Object} fixture
 */

function defineFixture(url, fixture) {
  __fixtures__[url] = fixture;
}

exports.defineFixture = defineFixture;/*
 * Looks up a fixture by url.
 *
 * @param {String} url
 */

function lookupFixture (url) {
  return __fixtures__ && __fixtures__[url];
}

exports.lookupFixture = lookupFixture;function makePromise(settings) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    var fixture = lookupFixture(settings.url);
    if (fixture) {
      if (fixture.textStatus === 'success') {
        return Ember.run(null, resolve, fixture);
      } else {
        return Ember.run(null, reject, fixture);
      }
    }
    settings.success = makeSuccess(resolve);
    settings.error = makeError(reject);
    Ember.$.ajax(settings);
  }, 'ic-ajax: ' + (settings.type || 'GET') + ' to ' + settings.url);
};

function parseArgs() {
  var settings = {};
  if (arguments.length === 1) {
    if (typeof arguments[0] === "string") {
      settings.url = arguments[0];
    } else {
      settings = arguments[0];
    }
  } else if (arguments.length === 2) {
    settings = arguments[1];
    settings.url = arguments[0];
  }
  if (settings.success || settings.error) {
    throw new Ember.Error("ajax should use promises, received 'success' or 'error' callback");
  }
  return settings;
}

function makeSuccess(resolve) {
  return function(response, textStatus, jqXHR) {
    Ember.run(null, resolve, {
      response: response,
      textStatus: textStatus,
      jqXHR: jqXHR
    });
  }
}

function makeError(reject) {
  return function(jqXHR, textStatus, errorThrown) {
    Ember.run(null, reject, {
      jqXHR: jqXHR,
      textStatus: textStatus,
      errorThrown: errorThrown
    });
  };
}
},{}]},{},[1])
(1)
});