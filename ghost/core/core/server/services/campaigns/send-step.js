const logging = require('@tryghost/logging');
const db = require('../../data/db');
const {AutomatedEmailRecipient} = require('../../models');
const memberWelcomeEmailService = require('../member-welcome-emails/service');
const {LOG_KEY} = require('./constants');

async function sendStep({step, enrollmentId, memberId, memberEmail, memberName, memberUuid, campaignType}) {
    logging.info(`${LOG_KEY} Sending step ${step.sort_order} of campaign ${campaignType} to ${memberEmail}`);

    // Check for duplicate send (crash recovery)
    const existing = await db.knex('automated_email_recipients')
        .where('enrollment_id', enrollmentId)
        .where('step_order', step.sort_order)
        .first();

    if (existing) {
        logging.warn(`${LOG_KEY} Step ${step.sort_order} already sent for enrollment ${enrollmentId}, skipping`);
        return;
    }

    memberWelcomeEmailService.init();
    await memberWelcomeEmailService.api.sendCampaignStep({
        member: {name: memberName, email: memberEmail},
        step
    });

    try {
        await AutomatedEmailRecipient.add({
            member_id: memberId,
            automated_email_id: step.id,
            member_uuid: memberUuid,
            member_email: memberEmail,
            member_name: memberName,
            enrollment_id: enrollmentId,
            step_order: step.sort_order
        });
    } catch (err) {
        logging.error({system: {event: 'campaigns.track_send_failed'}, err}, `${LOG_KEY} Failed to track campaign step send`);
    }
}

module.exports = sendStep;
