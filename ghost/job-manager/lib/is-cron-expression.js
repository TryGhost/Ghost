const parser = require('cron-parser');

/**
 * Checks if expression follows supported CRON format as follows
 * e.g.:
 *  "2 * * * *" where:
 *
 *  "*    *    *    *    *    *"
 *   ┬    ┬    ┬    ┬    ┬    ┬
 *   │    │    │    │    │    |
 *   │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
 *   │    │    │    │    └───── month (1 - 12)
 *   │    │    │    └────────── day of month (1 - 31)
 *   │    │    └─────────────── hour (0 - 23)
 *   │    └──────────────────── minute (0 - 59)
 *   └───────────────────────── second (0 - 59, optional)
 *
 * @param {String} expression in CRON format
 *
 * @returns {boolean} wheather or not the expression is valid
 */
const isCronExpression = (expression) => {
    try {
        parser.parseExpression(expression);

        return true;
    } catch (err) {
        return false;
    }
};

module.exports = isCronExpression;
