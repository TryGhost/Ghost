// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const {DateTime} = require('luxon');
const sinon = require('sinon');
const {lastPeriodStart} = require('../lib/date-utils');

describe('Date Utils', function () {
    describe('fn: lastPeriodStart', function () {
        let clock;

        afterEach(function () {
            if (clock) {
                clock.restore();
            }
        });

        it('returns same date if current date is less than a period away from current date', async function () {
            const weekAgoDate = DateTime.now().toUTC().plus({weeks: -1});
            const weekAgoISO = weekAgoDate.toISO();

            const lastPeriodStartDate = lastPeriodStart(weekAgoISO, 'month');

            lastPeriodStartDate.should.equal(weekAgoISO);
        });

        it('returns beginning of last month\'s period', async function () {
            const weekAgoDate = DateTime.now().toUTC().plus({weeks: -1});
            const weekAgoISO = weekAgoDate.toISO();

            const weekAndAMonthAgo = weekAgoDate.plus({months: -1});
            const weekAndAMonthAgoISO = weekAndAMonthAgo.toISO();

            const lastPeriodStartDate = lastPeriodStart(weekAndAMonthAgoISO, 'month');

            lastPeriodStartDate.should.equal(weekAgoISO);
        });

        it('returns 3rd day or current month when monthly period started on 3rd day in the past', async function () {
            // fake current clock to be past 3rd day of a month
            clock = sinon.useFakeTimers(new Date('2021-08-18T19:00:52Z').getTime());

            const lastPeriodStartDate = lastPeriodStart('2020-03-03T23:00:01Z', 'month');

            lastPeriodStartDate.should.equal('2021-08-03T23:00:01.000Z');
        });

        it('returns 5rd day or last month when monthly period started on 5th day in the past and it is 3rd day of the month', async function () {
            // fake current clock to be on 3rd day of a month
            clock = sinon.useFakeTimers(new Date('2021-09-03T12:12:12Z').getTime());

            const lastPeriodStartDate = lastPeriodStart('2020-03-05T11:11:11Z', 'month');

            lastPeriodStartDate.should.equal('2021-08-05T11:11:11.000Z');
        });

        it('return 29th of Feb if the subscription started on the 31st day and it is a leap year', async function () {
            // fake current clock to be march of a leap year
            clock = sinon.useFakeTimers(new Date('2020-03-05T13:15:07Z').getTime());

            const lastPeriodStartDate = lastPeriodStart('2020-01-31T23:00:01Z', 'month');

            lastPeriodStartDate.should.equal('2020-02-29T23:00:01.000Z');
        });

        it('return 28th of Feb if the subscription started on the 30th day and it is **not** a leap year', async function () {
            // fake current clock to be March of non-leap year
            clock = sinon.useFakeTimers(new Date('2021-03-05T13:15:07Z').getTime());

            const lastPeriodStartDate = lastPeriodStart('2019-04-30T01:59:42Z', 'month');

            lastPeriodStartDate.should.equal('2021-02-28T01:59:42.000Z');
        });
    });
});
