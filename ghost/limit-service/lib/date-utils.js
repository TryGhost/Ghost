const differenceInMonths = require('date-fns/differenceInMonths');
const parseISO = require('date-fns/parseISO');
const addMonths = require('date-fns/addMonths');

const SUPPORTED_INTERVALS = ['month'];
/**
 * Calculates the start of the last period (billing, cycle, etc.) based on the start date
 * and the interval at which the cycle renews.
 *
 * @param {String} startDate - date in ISO 8601 format (https://en.wikipedia.org/wiki/ISO_8601)
 * @param {('month')} interval - currently only supports 'month' value, in the future might support 'year', etc.
 *
 * @returns {String} - date in ISO 8601 format (https://en.wikipedia.org/wiki/ISO_8601) of the last period start
 */
const lastPeriodStart = (startDate, interval) => {
    if (interval === 'month') {
        const startDateISO = parseISO(startDate);
        const fullPeriodsPast = differenceInMonths(new Date(), startDateISO);
        const lastPeriodStartDate = addMonths(startDateISO, fullPeriodsPast);

        return lastPeriodStartDate.toISOString();
    }

    throw new Error('Invalid interval specified. Only "month" value is accepted.');
};

module.exports = {
    lastPeriodStart,
    SUPPORTED_INTERVALS
};
