const ObjectId = require('bson-objectid').default;
const {chunk: chunkArray} = require('lodash');
const debug = require('@tryghost/debug')('jobs:clean-expired-comped');
const moment = require('moment');

/**
 * Clean expired complimentary subscriptions:
 *  - removes expired comped rows from members_products
 *  - moves affected members from comped to free
 *  - records a member status event for each change
 * Idempotent — safe to re-run.
 *
 * Members are updated with raw knex (not the model layer), so no
 * `member.edited` events fire automatically. The returned `memberEvents`
 * describe each change so the caller can emit them (the worker posts them to
 * the main thread via the model-event bridge; the in-process job emits directly).
 * @param {{knex: Function}} db
 * @returns {Promise<{deletedExpiredSubs: number, updatedMembers: number, memberEvents: Array<{id: string, previous: object, changed: object}>}>}
 */
module.exports = async function cleanExpiredComped(db) {
    const cleanupStartDate = new Date();
    debug('Starting cleanup of expired comp subscriptions');
    const expiredCompedRows = await db.knex('members_products')
        .where('expiry_at', '<', moment.utc().startOf('day').toISOString())
        .select('*');

    let deletedExpiredSubs = 0;
    let updatedMembers = 0;
    let memberEvents = [];

    if (expiredCompedRows?.length) {
        const rowIds = expiredCompedRows.map(d => d.id);
        const memberIds = expiredCompedRows.map(d => d.member_id);

        // Delete all expired comped rows
        deletedExpiredSubs = await db.knex('members_products')
            .whereIn('id', rowIds)
            .del();

        // fetch all comped members to update
        const membersToUpdate = await db.knex('members')
            .whereIn('id', memberIds)
            .andWhere('status', 'comped');

        const updateMemberIds = membersToUpdate.map(d => d.id);
        const now = new Date();

        // Update all comped members to free
        updatedMembers = await db.knex('members')
            .whereIn('id', updateMemberIds)
            .update({
                status: 'free',
                updated_at: now
            });

        const statusEvents = membersToUpdate.map((member) => {
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

        // Adds status event for members going comped->free
        for (const chunk of chunks) {
            await db.knex('members_status_events').insert(chunk);
        }

        memberEvents = membersToUpdate.map(member => ({
            id: member.id,
            previous: {
                status: member.status,
                updated_at: member.updated_at
            },
            changed: {
                status: 'free',
                updated_at: now
            }
        }));
    }

    const cleanupEndDate = new Date();
    debug(`Removed ${deletedExpiredSubs} expired subscriptions, updated ${updatedMembers} members in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`);

    return {deletedExpiredSubs, updatedMembers, memberEvents};
};
