/* jshint expr:true */
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {
    timeAgo
} from 'ghost-admin/helpers/gh-format-timeago';
import sinon from 'sinon';

describe('Unit: Helper: gh-format-timeago', function () {
    let mockDate;
    let utcStub;

    it('calculates the correct time difference', function () {
        mockDate = '2016-05-30T10:00:00.000Z';
        utcStub = sinon.stub(moment, 'utc').returns('2016-05-30T11:00:00.000Z');

        let result = timeAgo([mockDate]);
        expect(result).to.be.equal('an hour ago');

        moment.utc.restore();
    });
});
