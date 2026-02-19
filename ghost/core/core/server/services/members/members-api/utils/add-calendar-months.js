const errors = require('@tryghost/errors');

/**
 * Add calendar months in UTC while preserving month-end behavior.
 * Example: Jan 31 + 1 month => Feb 28/29 (not Mar 2/3).
 *
 * @param {Date|string|number} inputDate
 * @param {number} months
 * @returns {Date}
 */
module.exports = function addCalendarMonths(inputDate, months) {
    const sourceDate = new Date(inputDate);
    const normalizedMonths = Number(months);

    if (Number.isNaN(sourceDate.getTime())) {
        throw new errors.BadRequestError({
            message: 'inputDate must be a valid date'
        });
    }

    if (!Number.isInteger(normalizedMonths) || normalizedMonths < 1) {
        throw new errors.BadRequestError({
            message: 'months must be a positive integer'
        });
    }

    const target = new Date(Date.UTC(
        sourceDate.getUTCFullYear(),
        sourceDate.getUTCMonth(),
        1,
        sourceDate.getUTCHours(),
        sourceDate.getUTCMinutes(),
        sourceDate.getUTCSeconds(),
        sourceDate.getUTCMilliseconds()
    ));

    target.setUTCMonth(target.getUTCMonth() + normalizedMonths);

    const originalDay = sourceDate.getUTCDate();
    const daysInTargetMonth = new Date(Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth() + 1,
        0
    )).getUTCDate();

    target.setUTCDate(Math.min(originalDay, daysInTargetMonth));

    return target;
};
