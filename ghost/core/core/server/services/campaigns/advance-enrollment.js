const db = require('../../data/db');
const {computeNextEmailAt} = require('./campaign-queries');

async function advanceEnrollment({enrollmentId, steps, currentStepOrder}) {
    const currentIndex = steps.findIndex(s => s.sort_order === currentStepOrder);
    const nextStep = currentIndex >= 0 ? steps[currentIndex + 1] : null;

    if (!nextStep) {
        await db.knex('campaign_enrollments')
            .where('id', enrollmentId)
            .update({status: 'completed', current_step: currentStepOrder, next_email_at: null, updated_at: db.knex.raw('CURRENT_TIMESTAMP')});
        return;
    }

    const enrollment = await db.knex('campaign_enrollments').where('id', enrollmentId).first();
    const nextEmailAt = computeNextEmailAt({
        isFirstStep: false,
        delayDays: nextStep.delay_days,
        enrolledAt: enrollment.enrolled_at
    });

    await db.knex('campaign_enrollments')
        .where('id', enrollmentId)
        .update({current_step: nextStep.sort_order, next_email_at: nextEmailAt, updated_at: db.knex.raw('CURRENT_TIMESTAMP')});
}

module.exports = advanceEnrollment;
