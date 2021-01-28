/**
 * If we enable bluebird debug logs we see a huge memory usage.
 * You can reproduce by removing this line and import a big database export into Ghost.
 * `NODE_ENV=development node index.js`
 */
process.env.BLUEBIRD_DEBUG = 0;

const moment = require('moment-timezone');

/**
 * force UTC
 *   - you can require moment or moment-timezone, both is configured to UTC
 *   - you are allowed to use new Date() to instantiate datetime values for models, because they are transformed into UTC in the model layer
 *   - be careful when not working with models, every value from the native JS Date is local TZ
 *   - be careful when you work with date operations, therefor always wrap a date into moment
 */
moment.tz.setDefault('UTC');
