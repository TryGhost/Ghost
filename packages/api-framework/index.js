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
 * @property {(frame: import('./lib/Frame')) => object} [generateCacheKeyData]
 * @property {(frame: import('./lib/Frame')) => any} query
 * @property {true} [integrationTokens] - An integration's Admin API key may call this
 * @property {false} [staffTokens] - A staff token may not call this, though its user could
 */

/**
 * @typedef {Record<string, ControllerMethod | string> & Record<'docName', string>} Controller
 */

module.exports = require('./lib/api-framework');
