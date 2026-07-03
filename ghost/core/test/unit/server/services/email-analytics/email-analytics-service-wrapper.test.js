const assert = require('node:assert/strict');

const sinon = require('sinon');

const EmailAnalyticsServiceWrapper = require('../../../../../core/server/services/email-analytics/email-analytics-service-wrapper');

function createWrapper() {
    const wrapper = new EmailAnalyticsServiceWrapper();

    wrapper.service = {
        restoreScheduled: sinon.stub().resolves()
    };

    return wrapper;
}

describe('EmailAnalyticsServiceWrapper', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('startFetch', function () {
        it('fetches opened events, non-opened events, missing events, then scheduled events', async function () {
            const wrapper = createWrapper();
            const calls = [];

            wrapper.fetchLatestOpenedEvents = sinon.stub().callsFake(async (options) => {
                calls.push(['opened', options]);
                return 3;
            });
            wrapper.fetchLatestNonOpenedEvents = sinon.stub().callsFake(async (options) => {
                calls.push(['non-opened', options]);
                return 5;
            });
            wrapper.fetchMissing = sinon.stub().callsFake(async (options) => {
                calls.push(['missing', options]);
                return 7;
            });
            wrapper.fetchScheduled = sinon.stub().callsFake(async (options) => {
                calls.push(['scheduled', options]);
                return 0;
            });

            await wrapper.startFetch();

            assert.deepEqual(calls, [
                ['opened', {maxEvents: 10000}],
                ['non-opened', {maxEvents: 9997}],
                ['missing', {maxEvents: 9992}],
                ['scheduled', {maxEvents: 10000}]
            ]);
            sinon.assert.calledOnce(wrapper.service.restoreScheduled);
        });

        it('restarts without fetching non-opened events when opened events hit the event budget', async function () {
            const wrapper = createWrapper();

            wrapper.fetchLatestOpenedEvents = sinon.stub().resolves(10000);
            wrapper.fetchLatestNonOpenedEvents = sinon.stub().resolves(0);
            wrapper.fetchMissing = sinon.stub().resolves(0);
            wrapper.fetchScheduled = sinon.stub().resolves(0);
            wrapper._restartFetch = sinon.stub();

            await wrapper.startFetch();

            sinon.assert.calledOnceWithExactly(wrapper.fetchLatestOpenedEvents, {maxEvents: 10000});
            sinon.assert.notCalled(wrapper.fetchLatestNonOpenedEvents);
            sinon.assert.notCalled(wrapper.fetchMissing);
            sinon.assert.notCalled(wrapper.fetchScheduled);
            sinon.assert.calledOnceWithExactly(wrapper._restartFetch, 'high opened event count');
        });
    });
});
