const ObjectId = require('bson-objectid').default;
const db = require('../../data/db');
const {hasActiveSteps, getMaxCampaignVersion, getCampaignSteps, computeNextEmailAt} = require('./campaign-queries');

async function enrollMember({memberId, campaignType, transacting}) {
    const active = await hasActiveSteps(campaignType);
    if (!active) {
        return null;
    }

    const maxVersion = await getMaxCampaignVersion(campaignType);
    const steps = await getCampaignSteps(campaignType);
    const firstStep = steps[0];

    const enrolledAt = new Date();
    const nextEmailAt = firstStep ? computeNextEmailAt({
        isFirstStep: true,
        delayDays: firstStep.delay_days,
        enrolledAt
    }) : null;

    const enrollmentId = ObjectId().toHexString();
    const knexInstance = transacting || db.knex;
    await knexInstance('campaign_enrollments').insert({
        id: enrollmentId,
        member_id: memberId,
        campaign_type: campaignType,
        status: 'active',
        current_step: firstStep ? firstStep.sort_order : 0,
        enrolled_campaign_version: maxVersion,
        next_email_at: nextEmailAt,
        enrolled_at: enrolledAt,
        created_at: enrolledAt,
        updated_at: enrolledAt
    });

    return {enrollmentId};
}

module.exports = enrollMember;
