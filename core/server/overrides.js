var moment = require('moment-timezone'),
    _ = require('lodash'),
    toString = require('lodash.tostring');

/**
 * the version of lodash included in Ghost (3.10.1) does not have _.toString - it is added in a later version.
 */
_.toString = toString;

/**
 * force UTC
 *   - you can require moment or moment-timezone, both is configured to UTC
 *   - you are allowed to use new Date() to instantiate datetime values for models, because they are transformed into UTC in the model layer
 *   - be careful when not working with models, every value from the native JS Date is local TZ
 *   - be careful when you work with date operations, therefor always wrap a date into moment
 */
moment.tz.setDefault('UTC');

