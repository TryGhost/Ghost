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

        it('returns previousTotals for the equivalent prior window when both bounds are set', async function () {
            // The two totals queries fire via Promise.all, so dispatch order is
            // non-deterministic. We disambiguate by inspecting the `>=` lower
            // bound the service applied to the query (UTC ISO string from
            // `getDateBoundaries`).
            const isCurrentRange = (builder) => {
                const fromCall = builder.where.getCalls().find(call => call.args[1] === '>=');
                if (!fromCall) {
                    return false;
                }
                return fromCall.args[2] === '2026-02-08T00:00:00.000Z';
            };

            const {service} = createService({
                tableResults: {
                    comments: (builder) => {
                        if (builder.groupByRaw.called || builder.join.called) {
                            return [];
                        }
                        return isCurrentRange(builder)
                            ? [{count: '40', commenters: '15'}]
                            : [{count: '20', commenters: '8'}];
                    },
                    comment_reports: (builder) => {
                        if (builder.groupByRaw.called) {
                            return [];
                        }
                        return isCurrentRange(builder)
                            ? [{reported: '6'}]
                            : [{reported: '3'}];
                    }
                }
            });

            const result = await service.getOverview({dateFrom: '2026-02-08', dateTo: '2026-02-14'});

            assert.deepEqual(result.totals, {comments: 40, commenters: 15, reported: 6});
            assert.deepEqual(result.previousTotals, {comments: 20, commenters: 8, reported: 3});
        });

        it('interprets date bounds in the requested timezone', async function () {
            // PST is UTC-8; the start of 2026-02-08 in PST is 08:00 UTC, and
            // the end of 2026-02-08 in PST is 2026-02-09T07:59:59.999 UTC.
            const recordedBounds = [];
            const {service} = createService({
                tableResults: {
                    comments: (builder) => {
                        if (builder.groupByRaw.called || builder.join.called) {
                            return [];
                        }
                        const from = builder.where.getCalls().find(c => c.args[1] === '>=')?.args[2];
                        const to = builder.where.getCalls().find(c => c.args[1] === '<=')?.args[2];
                        recordedBounds.push({from, to});
                        return [{count: 0, commenters: 0}];
                    },
                    comment_reports: () => [{reported: 0}]
                }
            });

            await service.getOverview({
                dateFrom: '2026-02-08',
                dateTo: '2026-02-08',
                timezone: 'America/Los_Angeles'
            });

            const currentBounds = recordedBounds.find(b => b.from === '2026-02-08T08:00:00.000Z');
            assert.ok(currentBounds, 'expected current range lower bound at PST start-of-day in UTC');
            assert.equal(currentBounds.to, '2026-02-09T07:59:59.999Z');
        });

        it('returns previousTotals = null when range has no bounds', async function () {
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

            const result = await service.getOverview({});

            assert.equal(result.previousTotals, null);
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
