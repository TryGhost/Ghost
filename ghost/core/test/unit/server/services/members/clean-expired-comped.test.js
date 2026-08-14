const assert = require('node:assert/strict');
const Module = require('node:module');

const previousUpdatedAt = new Date('2026-04-28T15:55:45.000Z');

describe('Job: Clean expired comped members', function () {
    const jobPath = '../../../../../core/server/services/members/jobs/clean-expired-comped';

    afterEach(function () {
        delete require.cache[require.resolve(jobPath)];
    });

    it('bumps updated_at and posts model-event messages when expiring comped members', async function () {
        const updateCalls = [];
        const insertCalls = [];
        const messages = [];
        const done = new Promise((resolve) => {
            const parentPort = {
                once() {},
                postMessage(message) {
                    messages.push(message);

                    if (message === 'done') {
                        resolve();
                    }
                }
            };

            const restoreRequire = mockRequires({
                worker_threads: {parentPort},
                '../../../data/db': createDb(updateCalls, insertCalls)
            });

            try {
                require(jobPath);
            } finally {
                restoreRequire();
            }
        });

        await done;

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

        const modelEventMessage = messages.find(message => message && message.type === 'model-event');
        assert.deepEqual(modelEventMessage, {
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Member',
            id: 'member-id',
            previous: {
                status: 'comped',
                updated_at: previousUpdatedAt
            },
            changed: {
                status: 'free',
                updated_at: updateCalls[0].data.updated_at
            },
            options: {
                context: {internal: true}
            }
        });
        assert.ok(messages.indexOf(modelEventMessage) < messages.indexOf('done'));
    });
});

function createDb(updateCalls, insertCalls) {
    const knex = function knex(tableName) {
        return createQuery(tableName, updateCalls, insertCalls);
    };

    return {knex};
}

function createQuery(tableName, updateCalls, insertCalls) {
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
            return Promise.resolve([{
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

function mockRequires(mocks) {
    const originalLoad = Module._load;

    Module._load = function mockLoad(request, parent, isMain) {
        if (Object.prototype.hasOwnProperty.call(mocks, request)) {
            return mocks[request];
        }

        return originalLoad.call(this, request, parent, isMain);
    };

    return function restoreRequire() {
        Module._load = originalLoad;
    };
}
