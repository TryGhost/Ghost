const logging = require('@tryghost/logging');
const {getCampaignSteps} = require('./campaign-queries');
const sendStep = require('./send-step');
const advanceEnrollment = require('./advance-enrollment');
const {LOG_KEY} = require('./constants');

async function processEnrollment({enrollmentId, memberId, memberEmail, memberName, memberUuid, campaignType}) {
    const steps = await getCampaignSteps(campaignType);
    if (steps.length === 0) {
        logging.warn(`${LOG_KEY} No steps found for campaign ${campaignType}, skipping enrollment ${enrollmentId}`);
        return;
    }

    // Send the first step immediately if it has delay_days=0 and is active
    const firstStep = steps[0];
    if (!firstStep || firstStep.status !== 'active' || firstStep.delay_days !== 0) {
        logging.info(`${LOG_KEY} First step for campaign ${campaignType} is not an immediate send (delay=${firstStep?.delay_days}, status=${firstStep?.status}), deferring to scheduler`);
        return;
    }

    await sendStep({step: firstStep, enrollmentId, memberId, memberEmail, memberName, memberUuid, campaignType});
    await advanceEnrollment({enrollmentId, steps, currentStepOrder: firstStep.sort_order});
}

module.exports = processEnrollment;
