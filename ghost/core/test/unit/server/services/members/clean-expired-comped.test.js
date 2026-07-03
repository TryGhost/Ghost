const assert = require('node:assert/strict');
const cleanExpiredComped = require('../../../../../core/server/services/members/jobs/lib/clean-expired-comped');

const previousUpdatedAt = new Date('2026-04-28T15:55:45.000Z');

describe('Job lib: cleanExpiredComped', function () {
    it('bumps updated_at, records status events and returns member events', async function () {
        const updateCalls = [];
        const insertCalls = [];
        const db = createDb(updateCalls, insertCalls);

        const {deletedExpiredSubs, updatedMembers, memberEvents} = await cleanExpiredComped(db);

        assert.equal(deletedExpiredSubs, 1);
        assert.equal(updatedMembers, 1);

        assert.equal(updateCalls.length, 1);
        assert.equal(updateCalls[0].tableName, 'members');
        assert.deepEqual(updateCalls[0].ids, ['member-id']);
        assert.equal(updateCalls[0].data.status, 'free');
        assert.ok(updateCalls[0].data.updated_at instanceof Date);

        // Status event shares the same timestamp as the member update (not a raw CURRENT_TIMESTAMP)
        const statusEventInsert = insertCalls.find(call => call.tableName === 'members_status_events');
        assert.ok(statusEventInsert);
        assert.ok(statusEventInsert.rows[0].created_at instanceof Date);
        assert.deepEqual(statusEventInsert.rows[0].created_at, updateCalls[0].data.updated_at);

        // The returned events describe the change so the handler can emit member.edited
        assert.deepEqual(memberEvents, [{
            id: 'member-id',
            previous: {
                status: 'comped',
                updated_at: previousUpdatedAt
            },
            changed: {
                status: 'free',
                updated_at: updateCalls[0].data.updated_at
            }
        }]);
    });

    it('does nothing when no comped subscriptions have expired', async function () {
        const updateCalls = [];
        const insertCalls = [];
        const db = createDb(updateCalls, insertCalls, {expiredRows: []});

        const {deletedExpiredSubs, updatedMembers, memberEvents} = await cleanExpiredComped(db);

        assert.equal(deletedExpiredSubs, 0);
        assert.equal(updatedMembers, 0);
        assert.deepEqual(memberEvents, []);
        assert.equal(updateCalls.length, 0);
        assert.equal(insertCalls.length, 0);
    });
});

function createDb(updateCalls, insertCalls, {expiredRows} = {}) {
    const knex = function knex(tableName) {
        return createQuery(tableName, updateCalls, insertCalls, expiredRows);
    };

    return {knex};
}

function createQuery(tableName, updateCalls, insertCalls, expiredRows) {
    const query = {
        ids: null,

        where() {
            return query;
        },

        whereIn(_field, ids) {
            query.ids = ids;
            return query;
        },

        andWhere() {
            return Promise.resolve([{
                id: 'member-id',
                status: 'comped',
                updated_at: previousUpdatedAt
            }]);
        },

        select() {
            return Promise.resolve(expiredRows ?? [{
                id: 'expired-product-relation-id',
                member_id: 'member-id'
            }]);
        },

        del() {
            return Promise.resolve(query.ids.length);
        },

        update(data) {
            updateCalls.push({
                tableName,
                ids: query.ids,
                data
            });

            return Promise.resolve(query.ids.length);
        },

        insert(rows) {
            insertCalls.push({tableName, rows});
            return Promise.resolve();
        }
    };

    return query;
}
