import * as assert from 'assert/strict';
import trackEvent from '../../../src/utils/analytics';

describe('trackEvent', function () {
    it('calls posthog.capture with the correct event name and properties', function () {
        const testEventName = 'Recommendation Added';
        const testProps = {
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

        trackEvent(testEventName, testProps);
    });

    it('calls plausible with the correct event name and properties', function () {
        const testEventName = 'Recommendation Added';
        const testProps = {
            oneClickSubscribe: true
        };

        window.plausible = (eventName, {props}) => {
            assert.equal(eventName, 'Recommendation Added');
            assert.deepEqual(props, {
                oneClickSubscribe: true
            });
        };

        trackEvent(testEventName, testProps);
    });
});
