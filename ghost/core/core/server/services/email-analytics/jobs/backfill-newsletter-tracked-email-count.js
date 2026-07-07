const logging = require('@tryghost/logging');
const db = require('../../../data/db');
const queries = require('../../email-analytics/lib/queries');

const BATCH_SIZE = 500;
const INTERVAL_MS = 60 * 1000;

let isRunning = false;

async function backfillBatch() {
    const members = await db.knex('members')
        .select('id')
        .whereNull('newsletter_tracked_email_count')
        .limit(BATCH_SIZE);

    if (members.length === 0) {
        return 0;
    }

    await queries.aggregateMemberStatsBatch(members.map(member => member.id));
    return members.length;
}

async function backfill() {
    if (isRunning) {
        return;
    }

    isRunning = true;

    try {
        await backfillBatch();
    } catch (err) {
        logging.error(err);
    } finally {
        isRunning = false;
    }
}

function scheduleRecurringJobs() {
    setTimeout(backfill, 10 * 1000).unref();
    setInterval(backfill, INTERVAL_MS).unref();
}

module.exports = {
    backfillBatch,
    scheduleRecurringJobs
};
