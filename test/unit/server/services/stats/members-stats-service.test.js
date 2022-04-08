const MembersStatsService = require('../../../../../core/server/services/stats/lib/members-stats-service');
const moment = require('moment');
const sinon = require('sinon');
require('should');

describe('MembersStatsService', function () {
    describe('getCountHistory', function () {
        let membersStatsService;
        let fakeStatuses;
        let fakeTotal;

        /**
         * @type {MembersStatsService.TotalMembersByStatus}
         */
        const currentCounts = {paid: 0, free: 0, comped: 0};
        /**
         * @type {MembersStatsService.MemberStatusDelta[]}
         */
        let events = [];
        const today = '2000-01-10';
        const tomorrow = '2000-01-11';
        const yesterday = '2000-01-09';
        const dayBeforeYesterday = '2000-01-08';
        const twoDaysBeforeYesterday = '2000-01-07';
        const todayDate = moment(today).toDate();
        const tomorrowDate = moment(tomorrow).toDate();
        const yesterdayDate = moment(yesterday).toDate();
        const dayBeforeYesterdayDate = moment(dayBeforeYesterday).toDate();

        before(function () {
            sinon.useFakeTimers(todayDate.getTime());
            membersStatsService = new MembersStatsService({db: null});
            fakeTotal = sinon.stub(membersStatsService, 'getCount').resolves(currentCounts);
            fakeStatuses = sinon.stub(membersStatsService, 'fetchAllStatusDeltas').callsFake(() => {
                // Sort here ascending to mimic same ordering
                events.sort((a, b) => {
                    return a.date < b.date ? -1 : 1;
                });
                return Promise.resolve(events);
            });
        });

        afterEach(function () {
            fakeStatuses.resetHistory();
            fakeTotal.resetHistory();
        });

        it('Always returns at least one value', async function () {
            // No status events
            events = [];
            currentCounts.paid = 1;
            currentCounts.free = 2;
            currentCounts.comped = 3;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.length.should.eql(1);
            results[0].should.eql({
                date: today,
                paid: 1,
                free: 2,
                comped: 3,
                paid_subscribed: 0,
                paid_canceled: 0
            });
            meta.totals.should.eql(currentCounts);

            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Passes paid_subscribers and paid_canceled', async function () {
            // Update faked status events
            events = [
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }
            ];

            // Update current faked counts
            currentCounts.paid = 1;
            currentCounts.free = 2;
            currentCounts.comped = 3;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: yesterday,
                    paid: 0,
                    free: 0,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: today,
                    paid: 1,
                    free: 2,
                    comped: 3,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly resolves deltas', async function () {
            // Update faked status events
            events = [
                {
                    date: yesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: 0,
                    comped_delta: 0
                },
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }
            ];

            // Update current faked counts
            currentCounts.paid = 2;
            currentCounts.free = 3;
            currentCounts.comped = 4;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: dayBeforeYesterday,
                    paid: 0,
                    free: 1,
                    comped: 1,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: yesterday,
                    paid: 1,
                    free: 1,
                    comped: 1,
                    paid_subscribed: 2,
                    paid_canceled: 1
                }, 
                {
                    date: today,
                    paid: 2,
                    free: 3,
                    comped: 4,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly handles negative numbers', async function () {
            // Update faked status events
            events = [ 
                {
                    date: dayBeforeYesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: 2,
                    comped_delta: 10
                },
                {
                    date: yesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: -100,
                    comped_delta: 0
                }, 
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 100,
                    comped_delta: 3
                }
            ];

            // Update current faked counts
            currentCounts.paid = 2;
            currentCounts.free = 3;
            currentCounts.comped = 4;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: twoDaysBeforeYesterday,
                    paid: 0,
                    free: 1,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: dayBeforeYesterday,
                    paid: 0,
                    // note that this shouldn't be 100 (which is also what we test here):
                    free: 3, 
                    comped: 1,
                    paid_subscribed: 2,
                    paid_canceled: 1
                }, 
                {
                    date: yesterday,
                    paid: 1,
                    // never return negative numbers, this is in fact -997:
                    free: 0,
                    comped: 1,
                    paid_subscribed: 2,
                    paid_canceled: 1
                }, 
                {
                    date: today,
                    paid: 2,
                    free: 3,
                    comped: 4,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Ignores events in the future', async function () {
            // Update faked status events
            events = [
                {
                    date: yesterdayDate,
                    paid_subscribed: 1,
                    paid_canceled: 0,
                    free_delta: 1,
                    comped_delta: 0
                },
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }, 
                {
                    date: tomorrowDate,
                    paid_subscribed: 10,
                    paid_canceled: 5,
                    free_delta: 8,
                    comped_delta: 9
                }
            ];

            // Update current faked counts
            currentCounts.paid = 1;
            currentCounts.free = 2;
            currentCounts.comped = 3;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: dayBeforeYesterday,
                    paid: 0,
                    free: 0,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: yesterday,
                    paid: 0,
                    free: 0,
                    comped: 0,
                    paid_subscribed: 1,
                    paid_canceled: 0
                },
                {
                    date: today,
                    paid: 1,
                    free: 2,
                    comped: 3,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });
    });
});
