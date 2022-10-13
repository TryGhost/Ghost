import hbs from 'htmlbars-inline-precompile';
import moment from 'moment-timezone';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

// because why not?
const timezoneForTest = 'Iceland';

describe('Integration: Helper: gh-format-post-time', function () {
    setupRenderingTest();

    let sandbox = sinon.createSandbox();

    beforeEach(function () {
        let settings = this.owner.lookup('service:settings');
        settings.settingsModel = {};
        settings.timezone = timezoneForTest;
    });

    afterEach(function () {
        sandbox.restore();
    });

    function setupMockDate({date, utcDate}) {
        let mockDate = moment(date);

        // compute expectedTime before we override
        let expectedTime = moment.tz(mockDate, timezoneForTest).format('HH:mm');

        // stub moment.utc to return our provided utcDate
        let utcStub = sandbox.stub(moment, 'utc');
        utcStub.returns(moment(utcDate));
        utcStub.onFirstCall().returns(mockDate);

        return {expectedTime, mockDate};
    }

    it('returns basic time difference if post is draft', async function () {
        let mockDate = moment.utc().subtract(1, 'hour');
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate draft=true}}`);
        expect(this.element).to.have.trimmed.text('an hour ago');
    });

    it('returns difference if post was published less than 2 minutes ago', async function () {
        let mockDate = moment.utc().subtract(13, 'minutes');
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate published=true}}`);
        expect(this.element).to.have.trimmed.text('13 minutes ago');
    });

    it('returns difference if post is scheduled for less than 2 minutes from now', async function () {
        let mockDate = moment.utc().add(13, 'minutes');
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate scheduled=true}}`);
        expect(this.element).to.have.trimmed.text('in 13 minutes');
    });

    it('returns correct format if post was published on the same day', async function () {
        // needs to be outside of 12 hours
        let {mockDate, expectedTime} = setupMockDate({
            date: '2017-09-06T06:00:00Z',
            utcDate: '2017-09-06T19:00:00Z'
        });
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate published=true}}`);
        expect(this.element).to.have.trimmed.text(`${expectedTime} (UTC) Today`);
    });

    it('returns correct format if post is scheduled for the same day', async function () {
        // needs to be outside of 12 hours
        let {mockDate, expectedTime} = setupMockDate({
            date: '2017-09-06T06:00:00Z',
            utcDate: '2017-09-06T19:00:00Z'
        });
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate scheduled=true}}`);
        expect(this.element).to.have.trimmed.text(`at ${expectedTime} (UTC) Today`);
    });

    it('returns correct format if post was published yesterday', async function () {
        let {mockDate, expectedTime} = setupMockDate({
            date: '2017-09-05T16:00:00Z',
            utcDate: '2017-09-06T18:00:00Z'
        });
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate published=true}}`);
        expect(this.element).to.have.trimmed.text(`${expectedTime} (UTC) Yesterday`);
    });

    it('returns correct format if post is scheduled for tomorrow', async function () {
        let {mockDate, expectedTime} = setupMockDate({
            date: '2017-09-07T18:00:00Z',
            utcDate: '2017-09-06T16:00:00Z'
        });
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate scheduled=true}}`);
        expect(this.element).to.have.trimmed.text(`at ${expectedTime} (UTC) tomorrow`);
    });

    it('returns correct format if post was published prior to yesterday', async function () {
        let {mockDate} = setupMockDate({
            date: '2017-09-02T16:00:00Z',
            utcDate: '2017-09-06T18:00:00Z'
        });
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate published=true}}`);
        expect(this.element).to.have.trimmed.text('02 Sep 2017');
    });

    it('returns correct format if post is scheduled for later than tomorrow', async function () {
        let {mockDate, expectedTime} = setupMockDate({
            date: '2017-09-10T18:00:00Z',
            utcDate: '2017-09-06T16:00:00Z'
        });
        this.set('mockDate', mockDate);

        await render(hbs`{{gh-format-post-time mockDate scheduled=true}}`);
        expect(this.element).to.have.trimmed.text(`at ${expectedTime} (UTC) on 10 Sep 2017`);
    });
});
