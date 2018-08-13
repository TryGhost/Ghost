/**
 * If we enable bluebird debug logs we see a huge memory usage.
 * You can reproduce by removing this line and import a big database export into Ghost.
 * `NODE_ENV=development node index.js`
 */
process.env.BLUEBIRD_DEBUG = 0;

const moment = require('moment-timezone');

/**
 * oembed-parser uses promise-wtf to extend the global Promise with .finally
 *   - require it before global Bluebird Promise override so that promise-wtf
 *     doesn't error due to Bluebird's Promise already having a .finally
 *   - https://github.com/ndaidong/promise-wtf/issues/25
 */
const {extract, hasProvider} = require('oembed-parser'); // eslint-disable-line

/**
 * force UTC
 *   - you can require moment or moment-timezone, both is configured to UTC
 *   - you are allowed to use new Date() to instantiate datetime values for models, because they are transformed into UTC in the model layer
 *   - be careful when not working with models, every value from the native JS Date is local TZ
 *   - be careful when you work with date operations, therefor always wrap a date into moment
 */
moment.tz.setDefault('UTC');

/**
 * https://github.com/TryGhost/Ghost/issues/9064
 */
global.Promise = require('bluebird');
