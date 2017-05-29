/* jshint expr:true */
import moment from 'moment';
import sinon from 'sinon';
import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';
import {
    timeAgo
} from 'ghost-admin/helpers/gh-format-timeago';

describe('Unit: Helper: gh-format-timeago', function () {
    // eslint-disable-next-line no-unused-vars
    let mockDate, utcStub;

    it('calculates the correct time difference', function () {
        mockDate = '2016-05-30T10:00:00.000Z';
        utcStub = sinon.stub(moment, 'utc').returns('2016-05-30T11:00:00.000Z');

        let result = timeAgo([mockDate]);
        expect(result).to.be.equal('an hour ago');

        moment.utc.restore();
    });
});
