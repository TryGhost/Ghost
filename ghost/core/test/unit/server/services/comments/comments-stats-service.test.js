const assert = require('node:assert/strict');
const sinon = require('sinon');
const CommentsStatsService = require('../../../../../core/server/services/comments/comments-stats-service');

function makeQB(resultFn) {
    const qb = {};
    const chainable = [
        'select', 'where', 'whereIn', 'whereNotNull', 'count', 'countDistinct',
        'groupBy', 'groupByRaw', 'orderBy', 'orderByRaw', 'limit', 'join'
    ];
    for (const method of chainable) {
        qb[method] = sinon.stub().returns(qb);
    }
    qb.then = (resolve, reject) => Promise.resolve(resultFn(qb)).then(resolve, reject);
    qb.catch = fn => Promise.resolve(resultFn(qb)).catch(fn);
    return qb;
}

function createService({tableResults = {}} = {}) {
    const captured = {};
    const knex = sinon.stub().callsFake((table) => {
        const handler = tableResults[table];
        if (!handler) {
            throw new Error(`Unexpected knex table "${table}" in test`);
        }
        const qbs = captured[table] = captured[table] || [];
        const qb = makeQB(builder => handler(builder, qbs.length));
        qbs.push(qb);
        return qb;
    });
    knex.raw = sinon.stub().callsFake(v => v);

    return {
        service: new CommentsStatsService({db: {knex}}),
        knex,
        captured
    };
}

describe('CommentsStatsService', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('getOverview', function () {
        it('returns zeroed shape when DB has no matching rows', async function () {
            const {service} = createService({
                tableResults: {
                    comments: (builder) => {
                        if (builder.groupByRaw.called || builder.join.called) {
                            return [];
                        }
                        return [{count: 0, commenters: 0}];
                    },
                    comment_reports: (builder) => {
                        if (builder.groupByRaw.called) {
                            return [];
                        }
                        return [{reported: 0}];
                    }
                }
            });

            const result = await service.getOverview({dateFrom: '2026-01-01', dateTo: '2026-01-31'});

            assert.deepEqual(result.totals, {
                comments: 0,
                commenters: 0,
                reported: 0
            });
            assert.deepEqual(result.series, []);
            assert.deepEqual(result.topPosts, []);
            assert.deepEqual(result.topMembers, []);
        });

        it('maps aggregate rows into the expected shape', async function () {
            const {service} = createService({
                tableResults: {
                    comments: (builder) => {
                        if (builder.groupByRaw.called) {
                            return [
                                {date: '2026-01-10', count: '5', commenters: '4'},
                                {date: '2026-01-11', count: '7', commenters: '5'}
                            ];
                        }
                        if (builder.join.called) {
                            const joinArgs = builder.join.firstCall.args;
                            if (joinArgs[0] === 'posts') {
                                return [
                                    {id: 'post-1', title: 'Post One', slug: 'post-one', count: '20'},
                                    {id: 'post-2', title: 'Post Two', slug: 'post-two', count: '15'}
                                ];
                            }
                            if (joinArgs[0] === 'members') {
                                return [
                                    {id: 'mem-1', name: 'Alice', email: 'a@example.com', count: '12'},
                                    {id: 'mem-2', name: 'Bob', email: 'b@example.com', count: '9'}
                                ];
                            }
                        }
                        return [{count: '42', commenters: '11'}];
                    },
                    comment_reports: (builder) => {
                        if (builder.groupByRaw.called) {
                            return [{date: '2026-01-11', reported: '2'}];
                        }
                        return [{reported: '3'}];
                    }
                }
            });

            const result = await service.getOverview({dateFrom: '2026-01-01', dateTo: '2026-01-31'});

            assert.deepEqual(result.totals, {
                comments: 42,
                commenters: 11,
                reported: 3
            });
            assert.deepEqual(result.series, [
                {date: '2026-01-10', count: 5, commenters: 4, reported: 0},
                {date: '2026-01-11', count: 7, commenters: 5, reported: 2}
            ]);
            assert.deepEqual(result.topPosts[0], {
                id: 'post-1', title: 'Post One', slug: 'post-one', count: 20
            });
            assert.deepEqual(result.topMembers[0], {
                id: 'mem-1', name: 'Alice', email: 'a@example.com', count: 12
            });
        });

        it('includes reports-only days in the series even when no comments landed that day', async function () {
            const {service} = createService({
                tableResults: {
                    comments: (builder) => {
                        if (builder.groupByRaw.called || builder.join.called) {
                            return [];
                        }
                        return [{count: 0, commenters: 0}];
                    },
                    comment_reports: (builder) => {
                        if (builder.groupByRaw.called) {
                            return [{date: '2026-02-15', reported: '4'}];
                        }
                        return [{reported: '4'}];
                    }
                }
            });

            const result = await service.getOverview({});

            assert.deepEqual(result.series, [
                {date: '2026-02-15', count: 0, commenters: 0, reported: 4}
            ]);
        });

        it('formats Date instances in series rows into YYYY-MM-DD strings', async function () {
            const {service} = createService({
                tableResults: {
                    comments: (builder) => {
                        if (builder.groupByRaw.called) {
                            return [{date: new Date('2026-03-07T00:00:00.000Z'), count: 4, commenters: 3}];
                        }
                        if (builder.join.called) {
                            return [];
                        }
                        return [{count: 0, commenters: 0}];
                    },
                    comment_reports: (builder) => {
                        if (builder.groupByRaw.called) {
                            return [];
                        }
                        return [{reported: 0}];
                    }
                }
            });

            const result = await service.getOverview({});

            assert.deepEqual(result.series, [{date: '2026-03-07', count: 4, commenters: 3, reported: 0}]);
        });
    });
});
