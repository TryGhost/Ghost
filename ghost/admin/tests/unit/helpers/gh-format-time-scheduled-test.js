/* jshint expr:true */
import EmberObject from 'ember-object';
import {expect} from 'chai';
import {
    describe,
    it
} from 'mocha';
import {
    timeToSchedule
} from 'ghost-admin/helpers/gh-format-time-scheduled';
import sinon from 'sinon';

describe('Unit: Helper: gh-format-time-scheduled', function () {
    let mockDate;
    let mockTimezone;

    it('renders the date with the bog timezone', function () {
        mockDate = '2016-05-30T10:00:00.000Z';
        mockTimezone = EmberObject.create({
                content: 'Africa/Cairo',
                isFulfilled: true
            });

        let result = timeToSchedule([mockDate, mockTimezone]);
        expect(result).to.be.equal('30 May 2016, 12:00');
    });
    it('returns only when the timezone promise is fulfilled', function () {
        mockDate = '2016-05-30T10:00:00.000Z';
        mockTimezone = EmberObject.create({
                content: undefined,
                isFulfilled: false
            });

        let result = timeToSchedule([mockDate, mockTimezone]);
        expect(result).to.be.equal(undefined);
    });
});
