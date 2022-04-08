const MrrStatsService = require('../../../../../core/server/services/stats/lib/mrr-stats-service');
const moment = require('moment');
const sinon = require('sinon');
require('should');

describe('MrrStatsService', function () {
    describe('getHistory', function () {
        let mrrStatsService;
        let fakeDeltas;
        let fakeTotal;

        /**
         * @type {Object.<string, number>}
         */
        let currentMrr = {};
        /**
         * @type {MrrStatsService.MrrDelta[]}
         */
        let deltas = [];

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
            mrrStatsService = new MrrStatsService({db: null});
            fakeTotal = sinon.stub(mrrStatsService, 'getCurrentMrr').callsFake(() => {
                const arr = [];
                const sortedCurrencies = Object.keys(currentMrr).sort();
                for (const currency of sortedCurrencies) {
                    arr.push({
                        mrr: currentMrr[currency],
                        currency
                    });
                }

                // Make sure we sort by currency
                return Promise.resolve(arr);
            });
            fakeDeltas = sinon.stub(mrrStatsService, 'fetchAllDeltas').callsFake(() => {
                // Sort here alphabetically to mimic same ordering of fetchAllDeltas
                // Not a real problem we sort in place
                deltas.sort((a, b) => {
                    if (a.date === b.date) {
                        return a.currency < b.currency ? -1 : 1;
                    }
                    return a.date < b.date ? -1 : 1;
                });
                return Promise.resolve(deltas);
            });
        });

        afterEach(function () {
            fakeDeltas.resetHistory();
            fakeTotal.resetHistory();
        });

        it('Always returns at least one value', async function () {
            // No events
            deltas = [];
            currentMrr = {usd: 1, eur: 2};

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(2);

            // Note that currencies should always be sorted ascending, so EUR should be first.
            results[0].should.eql({
                date: today,
                mrr: 2,
                currency: 'eur'
            });
            results[1].should.eql({
                date: today,
                mrr: 1,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 2,
                    currency: 'eur'
                },
                {
                    mrr: 1,
                    currency: 'usd'
                }
            ]);
            fakeDeltas.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Does not substract delta of first event', async function () {
            deltas = [
                {
                    date: todayDate,
                    delta: 5,
                    currency: 'usd'
                }
            ];

            currentMrr = {usd: 5};

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(2);
            results[0].should.eql({
                date: yesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[1].should.eql({
                date: today,
                mrr: 5,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 5,
                    currency: 'usd'
                }
            ]);
            fakeDeltas.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly calculates deltas', async function () {
            deltas = [
                {
                    date: yesterdayDate,
                    delta: 2,
                    currency: 'usd'
                },
                {
                    date: todayDate,
                    delta: 5,
                    currency: 'usd'
                }
            ];

            currentMrr = {usd: 7};

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(3);
            results[0].should.eql({
                date: dayBeforeYesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[1].should.eql({
                date: yesterday,
                mrr: 2,
                currency: 'usd'
            });
            results[2].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
            fakeDeltas.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly calculates deltas for multiple currencies', async function () {
            deltas = [
                {
                    date: yesterdayDate,
                    delta: 200,
                    currency: 'eur'
                },
                {
                    date: yesterdayDate,
                    delta: 2,
                    currency: 'usd'
                },
                {
                    date: todayDate,
                    delta: 800,
                    currency: 'eur'
                },
                {
                    date: todayDate,
                    delta: 5,
                    currency: 'usd'
                }
            ];

            currentMrr = {usd: 7, eur: 1200};

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(6);
            results[0].should.eql({
                date: dayBeforeYesterday,
                mrr: 200,
                currency: 'eur'
            });
            results[1].should.eql({
                date: dayBeforeYesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[2].should.eql({
                date: yesterday,
                mrr: 400,
                currency: 'eur'
            });
            results[3].should.eql({
                date: yesterday,
                mrr: 2,
                currency: 'usd'
            });
            results[4].should.eql({
                date: today,
                mrr: 1200,
                currency: 'eur'
            });
            results[5].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 1200,
                    currency: 'eur'
                },
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
            fakeDeltas.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Ignores invalid currencies in deltas', async function () {
            deltas = [
                {
                    date: todayDate,
                    delta: 200,
                    currency: 'abc'
                }
            ];

            currentMrr = {usd: 7};

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(1);
            results[0].should.eql({
                date: yesterday,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
            fakeDeltas.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Ignores events in the future', async function () {
            deltas = [
                {
                    date: yesterdayDate,
                    delta: 2,
                    currency: 'usd'
                },
                {
                    date: todayDate,
                    delta: 5,
                    currency: 'usd'
                },
                {
                    date: tomorrowDate,
                    delta: 10,
                    currency: 'usd'
                }
            ];

            currentMrr = {usd: 7};

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(3);
            results[0].should.eql({
                date: dayBeforeYesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[1].should.eql({
                date: yesterday,
                mrr: 2,
                currency: 'usd'
            });
            results[2].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
            fakeDeltas.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly handles negative total MRR', async function () {
            deltas = [
                {
                    date: dayBeforeYesterdayDate,
                    delta: 2,
                    currency: 'usd'
                },
                {
                    date: yesterdayDate,
                    delta: -1000,
                    currency: 'usd'
                },
                {
                    date: todayDate,
                    delta: 1000,
                    currency: 'usd'
                }
            ];

            currentMrr = {usd: 7};

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(4);
            results[0].should.eql({
                date: twoDaysBeforeYesterday,
                mrr: 5,
                currency: 'usd'
            });
            results[1].should.eql({
                date: dayBeforeYesterday,
                // We are mainly testing that this should not be 1000!
                mrr: 7,
                currency: 'usd'
            });
            results[2].should.eql({
                date: yesterday,
                // Should never be shown negative (in fact it is -993 here)
                mrr: 0,
                currency: 'usd'
            });
            results[3].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
            fakeDeltas.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });
    });
});
