import moment from 'moment-timezone';
import {beforeEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: dashboardStats', function () {
    setupTest();

    let dashboardStatsService;

    beforeEach(function () {
        dashboardStatsService = this.owner.lookup('service:dashboardStats');
    });

    it('Test dashboard stats', function () {
        expect(0).to.equal(0);
    });

    it('exists', function () {
        expect(dashboardStatsService).to.be.ok;
    });

    it('memberSourceAttributionCounts returns an empty array when memberAttributionStats is null', function () {
        dashboardStatsService.memberAttributionStats = null;

        let result = dashboardStatsService.memberSourceAttributionCounts;
        expect(result).to.deep.equal([]);
    });

    it('memberSourceAttributionCounts returns aggregated and sorted data', function () {
        dashboardStatsService.chartDays = 30;
        let today = moment().format('YYYY-MM-DD');
        let fiveDaysAgo = moment().subtract(5, 'days').format('YYYY-MM-DD');
        let tenDaysAgo = moment().subtract(10, 'days').format('YYYY-MM-DD');

        dashboardStatsService.memberAttributionStats = [
            {date: today, source: 'google', signups: 10, paidConversions: 2},
            {date: today, source: 'facebook', signups: 5, paidConversions: 1},
            {date: fiveDaysAgo, source: 'google', signups: 3, paidConversions: 1},
            {date: tenDaysAgo, source: 'twitter', signups: 2, paidConversions: 0},
            {date: tenDaysAgo, source: 'google', signups: 1, paidConversions: 1}
        ];

        let result = dashboardStatsService.memberSourceAttributionCounts;

        let expected = [
            {source: 'google', signups: 14, paidConversions: 4},
            {source: 'facebook', signups: 5, paidConversions: 1},
            {source: 'twitter', signups: 2, paidConversions: 0}
        ];

        expect(result).to.deep.equal(expected);
    });

    it('memberSourceAttributionCounts filters data based on chartDays', function () {
        dashboardStatsService.chartDays = 7;
        let today = moment().format('YYYY-MM-DD');
        let fiveDaysAgo = moment().subtract(5, 'days').format('YYYY-MM-DD');
        let tenDaysAgo = moment().subtract(10, 'days').format('YYYY-MM-DD');

        dashboardStatsService.memberAttributionStats = [
            {date: today, source: 'google', signups: 10, paidConversions: 2},
            {date: fiveDaysAgo, source: 'facebook', signups: 5, paidConversions: 1},
            {date: tenDaysAgo, source: 'twitter', signups: 2, paidConversions: 0}
        ];

        let result = dashboardStatsService.memberSourceAttributionCounts;

        let expected = [
            {source: 'google', signups: 10, paidConversions: 2},
            {source: 'facebook', signups: 5, paidConversions: 1}
        ];

        expect(result).to.deep.equal(expected);
    });

    it('memberSourceAttributionCounts is not case sensitive', function () {
        dashboardStatsService.chartDays = 30;
        let today = moment().format('YYYY-MM-DD');
        let fiveDaysAgo = moment().subtract(5, 'days').format('YYYY-MM-DD');
        let tenDaysAgo = moment().subtract(10, 'days').format('YYYY-MM-DD');

        dashboardStatsService.memberAttributionStats = [
            {date: today, source: 'google', signups: 10, paidConversions: 2},
            {date: today, source: 'facebook', signups: 5, paidConversions: 1},
            {date: fiveDaysAgo, source: 'google', signups: 3, paidConversions: 1},
            {date: tenDaysAgo, source: 'twitter', signups: 2, paidConversions: 0},
            {date: tenDaysAgo, source: 'Google', signups: 1, paidConversions: 1}
        ];

        let result = dashboardStatsService.memberSourceAttributionCounts;

        let expected = [
            {source: 'google', signups: 14, paidConversions: 4},
            {source: 'facebook', signups: 5, paidConversions: 1},
            {source: 'twitter', signups: 2, paidConversions: 0}
        ];

        expect(result).to.deep.equal(expected);
    });
});

