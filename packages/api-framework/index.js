/** @typedef {object} PermissionsObject */
/** @typedef {boolean} PermissionsBoolean */

/** @typedef {number} StatusCodeNumber */
/** @typedef {(result: any) => number} StatusCodeFunction */

/** @typedef {object} ValidationObject */

/**
 * @typedef {object} ControllerMethod
 * @property {object} headers
 * @property {PermissionsBoolean | PermissionsObject} permissions
 * @property {string[]} [options]
 * @property {ValidationObject} [validation]
 * @property {string[]} [data]
 * @property {StatusCodeFunction | StatusCodeNumber} [statusCode]
 * @property {object} [response]
 * @property {function} [cache]
 * @property {(frame: import('./src/Frame')) => object} [generateCacheKeyData]
 * @property {(frame: import('./src/Frame')) => any} query
 */

/**
 * @typedef {Record<string, ControllerMethod | string> & Record<'docName', string>} Controller
 */

module.exports = require('./src/api-framework');
