const assert = require('node:assert/strict');
const Module = require('node:module');

const rawTimestamp = {raw: 'CURRENT_TIMESTAMP'};

describe('Job: Clean expired comped members', function () {
    const jobPath = '../../../../../core/server/services/members/jobs/clean-expired-comped';

    afterEach(function () {
        delete require.cache[require.resolve(jobPath)];
    });

    it('bumps updated_at when expiring comped members', async function () {
        const updateCalls = [];
        const done = new Promise((resolve) => {
            const parentPort = {
                once() {},
                postMessage(message) {
                    if (message === 'done') {
                        resolve();
                    }
                }
            };

            const restoreRequire = mockRequires({
                worker_threads: {parentPort},
                '../../../data/db': createDb(updateCalls)
            });

            try {
                require(jobPath);
            } finally {
                restoreRequire();
            }
        });

        await done;

        assert.deepEqual(updateCalls, [{
            tableName: 'members',
            ids: ['member-id'],
            data: {
                status: 'free',
                updated_at: rawTimestamp
            }
        }]);
    });
});

function createDb(updateCalls) {
    const knex = function knex(tableName) {
        return createQuery(tableName, updateCalls);
    };

    knex.raw = function raw(value) {
        assert.equal(value, 'CURRENT_TIMESTAMP');
        return rawTimestamp;
    };

    return {knex};
}

function createQuery(tableName, updateCalls) {
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
                status: 'comped'
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

        insert() {
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
