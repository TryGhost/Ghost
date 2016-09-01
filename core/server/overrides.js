var moment = require('moment-timezone'),
    _ = require('lodash'),
    toPairs = require('lodash.topairs'),
    fromPairs = require('lodash.frompairs'),
    toString = require('lodash.tostring'),
    pickBy = require('lodash.pickby'),
    uniqBy = require('lodash.uniqby'),
    omitBy = require('lodash.omitby');

/**
 * force UTC
 *   - you can require moment or moment-timezone, both is configured to UTC
 *   - you are allowed to use new Date() to instantiate datetime values for models, because they are transformed into UTC in the model layer
 *   - be careful when not working with models, every value from the native JS Date is local TZ
 *   - be careful when you work with date operations, therefor always wrap a date into moment
 */
moment.tz.setDefault('UTC');

/**
 * lodash 4.x functions we use
 */
_.toPairs = toPairs;
_.fromPairs = fromPairs;
_.toString = toString;
_.omitBy = omitBy;
_.uniqBy = uniqBy;
_.pickBy = pickBy;
