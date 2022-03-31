const MembersStatsService = require('../../../../../core/server/services/stats/lib/members-stats-service');
const {DateTime} = require('luxon');
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
        const events = [];
        const today = '2000-01-10';
        const tomorrow = '2000-01-11';
        const yesterday = '2000-01-09';
        const todayDate = DateTime.fromISO(today).toJSDate();
        const tomorrowDate = DateTime.fromISO(tomorrow).toJSDate();
        const yesterdayDate = DateTime.fromISO(yesterday).toJSDate();

        before(function () {
            sinon.useFakeTimers(todayDate.getTime());
            membersStatsService = new MembersStatsService({db: null});
            fakeTotal = sinon.stub(membersStatsService, 'getCount').resolves(currentCounts);
            fakeStatuses = sinon.stub(membersStatsService, 'fetchAllStatusDeltas').resolves(events);
        });

        afterEach(function () {
            fakeStatuses.resetHistory();
            fakeTotal.resetHistory();
        });

        it('Always returns at least one value', async function () {
            // No status events
            events.splice(0, events.length);
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
            events.splice(0, events.length, {
                date: todayDate,
                paid_subscribed: 4,
                paid_canceled: 3,
                free_delta: 2,
                comped_delta: 3
            });

            // Update current faked counts
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
                paid_subscribed: 4,
                paid_canceled: 3
            });
            meta.totals.should.eql(currentCounts);

            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly resolves deltas', async function () {
            // Update faked status events
            events.splice(0, events.length, 
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }, 
                {
                    date: yesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: 0,
                    comped_delta: 0
                }
            );

            // Update current faked counts
            currentCounts.paid = 2;
            currentCounts.free = 3;
            currentCounts.comped = 4;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
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

        it('Ignores events in the future', async function () {
            // Update faked status events
            events.splice(0, events.length, 
                {
                    date: tomorrowDate,
                    paid_subscribed: 10,
                    paid_canceled: 5,
                    free_delta: 8,
                    comped_delta: 9
                }, 
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }, 
                {
                    date: yesterdayDate,
                    paid_subscribed: 0,
                    paid_canceled: 0,
                    free_delta: 0,
                    comped_delta: 0
                }
            );

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
    });
});
