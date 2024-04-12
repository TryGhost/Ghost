import * as assert from 'assert/strict';
import trackEvent from '../../../src/utils/analytics';


describe('trackEvent', function () {
    it('calls posthog.capture with the correct event name and properties', function () {
        const eventName = 'Recommendation Added';
        const props = {
            oneClickSubscribe: true
        };

        window.posthog = {
            capture: (eventName, props) => {
                assert.equal(eventName, 'Recommendation Added');
                assert.deepEqual(props, {
                    oneClickSubscribe: true
                });
            }
        };

        trackEvent(eventName, props);
    });

    it('calls plausible with the correct event name and properties', function () {
        const eventName = 'Recommendation Added';
        const props = {
            oneClickSubscribe: true
        };

        window.plausible = (eventName, {props}) => {
            assert.equal(eventName, 'Recommendation Added');
            assert.deepEqual(props, {
                oneClickSubscribe: true
            });
        };

        trackEvent(eventName, props);
    });
});
