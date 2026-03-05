const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const logging = require('@tryghost/logging');
const campaignService = require('../../campaigns');

const LOG_KEY = `${OUTBOX_LOG_KEY}[CAMPAIGN-ENROLLMENT]`;

/**
 * Handles CampaignEnrollmentEvent from the outbox.
 * If step 0 has delay_days=0, sends immediately and advances to step 1.
 */
async function handle({payload}) {
    const {memberId, memberEmail, memberName, memberUuid, campaignType, enrollmentId} = payload;

    logging.info(`${LOG_KEY} Processing enrollment ${enrollmentId} for ${memberEmail} in campaign ${campaignType}`);

    await campaignService.processEnrollment({
        enrollmentId,
        memberId,
        memberEmail,
        memberName,
        memberUuid,
        campaignType
    });
}

function getLogInfo(payload) {
    const email = payload?.memberEmail || 'unknown member';
    return payload?.memberName ? `${payload.memberName} (${email})` : email;
}

module.exports = {handle, getLogInfo, LOG_KEY};
