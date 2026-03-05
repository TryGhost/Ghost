const db = require('../../data/db');

async function exitCampaign({memberId, campaignType, exitReason, transacting}) {
    await (transacting || db.knex)('campaign_enrollments')
        .where('member_id', memberId)
        .where('campaign_type', campaignType)
        .where('status', 'active')
        .update({
            status: 'exited',
            exit_reason: exitReason,
            next_email_at: null,
            exited_at: db.knex.raw('CURRENT_TIMESTAMP'),
            updated_at: db.knex.raw('CURRENT_TIMESTAMP')
        });
}

async function exitAllCampaigns({memberId, exitReason, transacting}) {
    await (transacting || db.knex)('campaign_enrollments')
        .where('member_id', memberId)
        .where('status', 'active')
        .update({
            status: 'exited',
            exit_reason: exitReason,
            next_email_at: null,
            exited_at: db.knex.raw('CURRENT_TIMESTAMP'),
            updated_at: db.knex.raw('CURRENT_TIMESTAMP')
        });
}

module.exports = {exitCampaign, exitAllCampaigns};
