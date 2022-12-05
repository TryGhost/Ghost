/**
 * Adds artificial "sleep" time that can be awaited
 * In most cases where this module is used we are awaiting
 * for the async event processing to trigger/finish
 * 
 * Can probably be substituted by timerPromises in the future
 * ref.: https://nodejs.org/dist/latest-v18.x/docs/api/timers.html#timerspromisessettimeoutdelay-value-options
 * @param {number} ms
 * @returns {Promise<void>}
 */
module.exports = ms => (
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
);
