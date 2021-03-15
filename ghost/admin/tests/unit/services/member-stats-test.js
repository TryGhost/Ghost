import moment from 'moment';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: membersStats', function () {
    setupTest();

    let memberStatsService;

    beforeEach(function () {
        memberStatsService = this.owner.lookup('service:membersStats');
    });

    it('fills correct date and value for mrr data', function () {
        const data = [
            {
                date: moment().subtract(31, 'days').format('YYYY-MM-DD'),
                value: 14459
            },
            {
                date: moment().subtract(10, 'days').format('YYYY-MM-DD'),
                value: 98176
            }
        ];
        const output = memberStatsService.fillDates(data);
        const values = Object.values(output);
        const keys = Object.keys(output);

        expect(values[0]).to.equal(14459);
        expect(keys[0]).to.equal(moment().subtract(30, 'days').format('YYYY-MM-DD'));
        expect(keys[keys.length - 1]).to.equal(moment().format('YYYY-MM-DD'));
        expect(values[values.length - 1]).to.equal(98176);
    });
});
