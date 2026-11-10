import trackEvent from '@/settings/utils/analytics';

describe('trackEvent', function () {
  it('calls plausible with the correct event name and properties', function () {
    const testEventName = 'Recommendation Added';
    const testProps = {
      oneClickSubscribe: true,
    };

    window.plausible = (eventName, { props }) => {
      expect(eventName).toBe('Recommendation Added');
      expect(props).toStrictEqual({
        oneClickSubscribe: true,
      });
    };

    trackEvent(testEventName, testProps);
  });
});
