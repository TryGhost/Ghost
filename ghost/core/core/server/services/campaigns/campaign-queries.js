const db = require('../../data/db');
const config = require('../../../shared/config');

/**
 * Convert delay_days to milliseconds based on the configured delay unit.
 * In development, set `campaigns:delayUnit` to "minutes" or "seconds" in config
 * to speed up testing (e.g. delay_days: 3 becomes 3 minutes).
 * Defaults to "days" in production.
 */
function delayToMs(delayDays) {
    const unit = config.get('campaigns:delayUnit') || 'days';
    const multipliers = {seconds: 1000, minutes: 60 * 1000, hours: 60 * 60 * 1000, days: 24 * 60 * 60 * 1000};
    return delayDays * (multipliers[unit] || multipliers.days);
}

/**
 * Compute when the next email should be sent.
 * @param {boolean} isFirstStep - true for the first step in the campaign (uses enrolledAt as base)
 * @param {number} delayDays - delay in days (or dev-configured units)
 * @param {Date|string} enrolledAt - when the member was enrolled
 * @param {Date} [now] - current time (for testing)
 */
function computeNextEmailAt({isFirstStep, delayDays, enrolledAt, now}) {
    const baseDate = isFirstStep ? new Date(enrolledAt) : (now || new Date());
    return new Date(baseDate.getTime() + delayToMs(delayDays));
}

async function getCampaignSteps(campaignType) {
    return await db.knex('automated_emails')
        .where('campaign_type', campaignType)
        .orderBy('sort_order', 'asc')
        .select('*');
}

async function getMaxCampaignVersion(campaignType) {
    const result = await db.knex('automated_emails')
        .where('campaign_type', campaignType)
        .max('version as maxVersion')
        .first();
    return result?.maxVersion || 1;
}

async function hasActiveSteps(campaignType) {
    const activeStep = await db.knex('automated_emails')
        .where('campaign_type', campaignType)
        .where('status', 'active')
        .first();
    return !!activeStep;
}

module.exports = {
    delayToMs,
    computeNextEmailAt,
    getCampaignSteps,
    getMaxCampaignVersion,
    hasActiveSteps
};
