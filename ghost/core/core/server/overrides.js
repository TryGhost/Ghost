/**
 * If we enable bluebird debug logs we see a huge memory usage.
 * You can reproduce by removing this line and import a big database export into Ghost.
 * `NODE_ENV=development node index.js`
 */
process.env.BLUEBIRD_DEBUG = 0;

const luxon = require('luxon');
const moment = require('moment-timezone');

/**
 * force UTC
 *   - old way: you can require moment or moment-timezone
 *   - new way: you should use Luxon - work is in progress to switch from moment.
 *
 *   - you are allowed to use new Date() to instantiate datetime values for models, because they are transformed into UTC in the model layer
 *   - be careful when not working with models, every value from the native JS Date is local TZ
 *   - be careful when you work with date operations, therefore always wrap a date with our timezone library
 */
luxon.Settings.defaultZone = 'UTC';
moment.tz.setDefault('UTC');
