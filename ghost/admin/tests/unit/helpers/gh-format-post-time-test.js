import moment from 'moment';
import sinon from 'sinon';
import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

// because why not?
const timezoneForTest = 'Iceland';

describe('Unit: Helper: gh-format-post-time', function () {
    setupTest('helper:gh-format-post-time', {
        unit: true,
        needs: ['service:settings']
    });

    let sandbox = sinon.sandbox.create();

    afterEach(function () {
        sandbox.restore();
    });

    function runFormatCheck(helper, date1, utc, options) {
        helper.set('settings', {activeTimezone: timezoneForTest});
        let mockDate = moment(date1);
        // Compute this before we override utc
        let expectedTime = moment.tz(mockDate, timezoneForTest).format('HH:mm');
        let utcStub = sandbox.stub(moment, 'utc');
        utcStub.returns(moment(utc));
        utcStub.onFirstCall().returns(mockDate);

        let result = helper.compute([mockDate], options);
        return {expectedTime, result};
    }

    it('returns basic time difference if post is draft', function () {
        let helper = this.subject();
        let mockDate = moment.utc().subtract(1, 'hour');

        let result = helper.compute([mockDate], {draft: true});
        expect(result).to.equal('an hour ago');
    });

    it('returns difference if post was published less than 15 minutes ago', function () {
        let helper = this.subject();
        let mockDate = moment.utc().subtract(13, 'minutes');

        let result = helper.compute([mockDate], {published: true});
        expect(result).to.equal('13 minutes ago');
    });

    it('returns difference if post is scheduled for less than 15 minutes from now', function () {
        let helper = this.subject();
        let mockDate = moment.utc().add(13, 'minutes');

        let result = helper.compute([mockDate], {scheduled: true});
        expect(result).to.equal('in 13 minutes');
    });

    it('returns correct format if post was published on the same day', function () {
        let {expectedTime, result} = runFormatCheck(
            this.subject(),
            '2017-09-06T16:00:00Z',
            '2017-09-06T18:00:00Z',
            {published: true}
        );
        expect(result).to.equal(`${expectedTime} Today`);
    });

    it('returns correct format if post is scheduled for the same day', function () {
        let {expectedTime, result} = runFormatCheck(
            this.subject(),
            '2017-09-06T18:00:00Z',
            '2017-09-06T16:00:00Z',
            {scheduled: true}
        );
        expect(result).to.equal(`at ${expectedTime} Today`);
    });

    it('returns correct format if post was published yesterday', function () {
        let {expectedTime, result} = runFormatCheck(
            this.subject(),
            '2017-09-05T16:00:00Z',
            '2017-09-06T18:00:00Z',
            {published: true}
        );
        expect(result).to.equal(`${expectedTime} Yesterday`);
    });

    it('returns correct format if post is scheduled for tomorrow', function () {
        let {expectedTime, result} = runFormatCheck(
            this.subject(),
            '2017-09-07T18:00:00Z',
            '2017-09-06T16:00:00Z',
            {scheduled: true}
        );
        expect(result).to.equal(`at ${expectedTime} Tomorrow`);
    });

    it('returns correct format if post was published prior to yesterday', function () {
        let {result} = runFormatCheck(
            this.subject(),
            '2017-09-02T16:00:00Z',
            '2017-09-06T18:00:00Z',
            {published: true}
        );
        expect(result).to.equal('02 Sep 2017');
    });

    it('returns correct format if post is scheduled for later than tomorrow', function () {
        let {expectedTime, result} = runFormatCheck(
            this.subject(),
            '2017-09-10T18:00:00Z',
            '2017-09-06T16:00:00Z',
            {scheduled: true}
        );
        expect(result).to.equal(`at ${expectedTime} on 10 Sep 2017`);
    });
});
