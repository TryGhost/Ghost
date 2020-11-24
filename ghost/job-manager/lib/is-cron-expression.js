const cronValidate = require('cron-validate');

/**
 * Checks if expression follows supported crontab format
 * reference: https://www.adminschoice.com/crontab-quick-reference
 * builder: https://crontab.guru/
 *
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
 * @param {String} expression in crontab format (https://www.gnu.org/software/mcron/manual/html_node/Crontab-file.html)
 *
 * @returns {boolean} wheather or not the expression is valid
 */
const isCronExpression = (expression) => {
    let cronResult = cronValidate(expression, {
        preset: 'default', // second field not supported in default preset
        override: {
            useSeconds: true // override preset option
        }
    });

    return cronResult.isValid();
};

module.exports = isCronExpression;
