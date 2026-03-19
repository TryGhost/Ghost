const {parentPort} = require('worker_threads');
const ObjectId = require('bson-objectid').default;
const {chunk: chunkArray} = require('lodash');
const debug = require('@tryghost/debug')('jobs:clean-expired-gifted');
const moment = require('moment');

// recurring job to clean expired gifted subscriptions

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Expired gifted subscriptions cleanup cancelled before completion');
        parentPort.postMessage('cancelled');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

if (parentPort) {
    parentPort.once('message', (message) => {
        if (message === 'cancel') {
            return cancel();
        }
    });
}

(async () => {
    const cleanupStartDate = new Date();
    const db = require('../../../data/db');
    debug(`Starting cleanup of expired gifted subscriptions`);
    const expiredGiftedRows = await db.knex('members_products')
        .join('members', 'members_products.member_id', 'members.id')
        .where('members.status', 'gifted')
        .where('members_products.expiry_at', '<', moment.utc().startOf('day').toISOString())
        .select('members_products.*');

    let deletedExpiredSubs = 0;
    let updatedMembers = 0;

    if (expiredGiftedRows?.length) {
        const rowIds = expiredGiftedRows.map(d => d.id);
        const memberIds = expiredGiftedRows.map(d => d.member_id);

        // Delete all expired gifted rows
        deletedExpiredSubs = await db.knex('members_products')
            .whereIn('id', rowIds)
            .del();

        // Fetch all gifted members to update
        const membersToUpdate = await db.knex('members')
            .whereIn('id', memberIds)
            .andWhere('status', 'gifted');

        const updateMemberIds = membersToUpdate.map(d => d.id);

        // Update all gifted members to free
        updatedMembers = await db.knex('members')
            .whereIn('id', updateMemberIds)
            .update({
                status: 'free'
            });

        const statusEvents = membersToUpdate.map((member) => {
            const now = db.knex.raw('CURRENT_TIMESTAMP');

            return {
                id: ObjectId().toHexString(),
                member_id: member.id,
                from_status: member.status,
                to_status: 'free',
                created_at: now
            };
        });

        // SQLite >= 3.32.0 can support 32766 host parameters
        // each row uses 5 variables so ⌊32766/5⌋ = 6553
        const chunkSize = 6553;

        const chunks = chunkArray(statusEvents, chunkSize);

        // Adds status event for members going gifted->free
        for (const chunk of chunks) {
            await db.knex('members_status_events').insert(chunk);
        }
    }

    let cleanupEndDate = new Date();

    debug(`Removed ${deletedExpiredSubs} expired gifted subscriptions, updated ${updatedMembers} members in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`);

    if (parentPort) {
        parentPort.postMessage(`Removed ${deletedExpiredSubs} expired gifted subscriptions, updated ${updatedMembers} members in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`);
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
