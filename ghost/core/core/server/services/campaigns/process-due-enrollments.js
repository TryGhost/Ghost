const logging = require('@tryghost/logging');
const db = require('../../data/db');
const {CampaignEnrollment} = require('../../models');
const {getCampaignSteps} = require('./campaign-queries');
const sendStep = require('./send-step');
const advanceEnrollment = require('./advance-enrollment');
const {LOG_KEY, CAMPAIGN_BATCH_SIZE} = require('./constants');

async function processSingleEnrollmentStep(enrollment) {
    const steps = await getCampaignSteps(enrollment.campaign_type);
    const currentStep = steps.find(s => s.sort_order === enrollment.current_step);

    const member = await CampaignEnrollment.findOne({id: enrollment.id}, {withRelated: ['member']});
    if (!member || !member.related('member')) {
        logging.warn(`${LOG_KEY} Member not found for enrollment ${enrollment.id}, marking completed`);
        await db.knex('campaign_enrollments').where('id', enrollment.id)
            .update({status: 'completed', next_email_at: null, updated_at: db.knex.raw('CURRENT_TIMESTAMP')});
        return;
    }

    const m = member.related('member');
    const memberData = {memberId: m.id, memberEmail: m.get('email'), memberName: m.get('name'), memberUuid: m.get('uuid')};

    if (!currentStep) {
        await db.knex('campaign_enrollments').where('id', enrollment.id)
            .update({status: 'completed', next_email_at: null, updated_at: db.knex.raw('CURRENT_TIMESTAMP')});
        return;
    }

    if (currentStep.status === 'active') {
        await sendStep({step: currentStep, enrollmentId: enrollment.id, ...memberData, campaignType: enrollment.campaign_type});
    } else {
        logging.info(`${LOG_KEY} Skipping inactive step ${currentStep.sort_order} for enrollment ${enrollment.id}`);
    }

    await advanceEnrollment({enrollmentId: enrollment.id, steps, currentStepOrder: currentStep.sort_order});
}

async function processDueEnrollments() {
    let totalProcessed = 0;
    let totalFailed = 0;

    while (true) { // eslint-disable-line no-constant-condition
        let enrollments = [];
        await db.knex.transaction(async (trx) => {
            enrollments = await trx('campaign_enrollments')
                .where('status', 'active').whereNotNull('next_email_at')
                .where('next_email_at', '<=', db.knex.raw('CURRENT_TIMESTAMP'))
                .orderBy('next_email_at', 'asc').limit(CAMPAIGN_BATCH_SIZE).forUpdate().select('*');
        });

        if (enrollments.length === 0) {
            break;
        }

        for (const enrollment of enrollments) {
            try {
                await processSingleEnrollmentStep(enrollment);
                totalProcessed += 1;
            } catch (err) {
                totalFailed += 1;
                logging.error({system: {event: 'campaigns.process_due_enrollment_failed'}, err}, `${LOG_KEY} Failed to process enrollment ${enrollment.id}`);
            }
        }
    }

    return {processed: totalProcessed, failed: totalFailed};
}

module.exports = processDueEnrollments;
