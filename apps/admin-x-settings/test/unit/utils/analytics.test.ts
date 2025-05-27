import trackEvent from '../../../src/utils/analytics';
import {describe, it} from 'vitest';
import {expect} from 'vitest';

describe('trackEvent', function () {
    it('calls posthog.capture with the correct event name and properties', function () {
        const testEventName = 'Recommendation Added';
        const testProps = {
            oneClickSubscribe: true
        };

        window.posthog = {
            capture: (eventName, props) => {
                expect(eventName).toBe('Recommendation Added');
                expect(props).toEqual({
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
            expect(eventName).toBe('Recommendation Added');
            expect(props).toEqual({
                oneClickSubscribe: true
            });
        };

        trackEvent(testEventName, testProps);
    });
});
