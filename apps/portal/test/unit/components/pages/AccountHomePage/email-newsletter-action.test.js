import {render, fireEvent} from '../../../../utils/test-utils';
import EmailNewsletterAction from '../../../../../src/components/pages/AccountHomePage/components/email-newsletter-action';
import {getSiteData, getMemberData, getNewslettersData} from '../../../../../src/utils/fixtures-generator';

const renderRow = ({member} = {}) => {
    const site = getSiteData({newsletters: getNewslettersData({numOfNewsletters: 1})});
    return render(
        <EmailNewsletterAction />,
        {overrideContext: {site, member: member ?? getMemberData()}}
    );
};

describe('EmailNewsletterAction', () => {
    test('row exposes role="button" and tabIndex for keyboard reachability', () => {
        const {getByText} = renderRow();
        const row = getByText('Email newsletter').closest('section');
        expect(row).toHaveAttribute('role', 'button');
        expect(row).toHaveAttribute('tabindex', '0');
    });

    test('aria-pressed reflects the current subscription state', () => {
        const newsletters = getNewslettersData({numOfNewsletters: 1});
        const {getByText: getSubscribed, unmount} = renderRow({member: getMemberData({newsletters})});
        const subscribedRow = getSubscribed('Email newsletter').closest('section');
        expect(subscribedRow).toHaveAttribute('aria-pressed', 'true');
        unmount();

        const {getByText: getUnsubscribed} = renderRow({member: getMemberData({newsletters: []})});
        const unsubscribedRow = getUnsubscribed('Email newsletter').closest('section');
        expect(unsubscribedRow).toHaveAttribute('aria-pressed', 'false');
    });

    test('inner Switch is removed from the accessibility tree and focus order', () => {
        const {container} = renderRow();
        const switchWrapper = container.querySelector('.gh-portal-for-switch');
        const input = container.querySelector('input[type="checkbox"]');

        expect(switchWrapper).toHaveAttribute('aria-hidden', 'true');
        expect(input).toHaveAttribute('tabindex', '-1');
    });

    test('keyboard activation toggles the subscription', () => {
        const {getByText, mockDoActionFn} = renderRow();
        const row = getByText('Email newsletter').closest('section');

        fireEvent.keyDown(row, {key: 'Enter'});
        expect(mockDoActionFn).toHaveBeenCalledWith('updateNewsletterPreference', expect.objectContaining({
            newsletters: expect.any(Array)
        }));

        mockDoActionFn.mockClear();
        fireEvent.keyDown(row, {key: ' '});
        expect(mockDoActionFn).toHaveBeenCalled();

        mockDoActionFn.mockClear();
        fireEvent.keyDown(row, {key: 'a'});
        expect(mockDoActionFn).not.toHaveBeenCalled();
    });

    test('clicking the inner switch does not double-fire the row toggle', () => {
        const {container, mockDoActionFn} = renderRow();
        const switchSpan = container.querySelector('[data-testid="default-newsletter-toggle"]');

        fireEvent.click(switchSpan);

        const updateCalls = mockDoActionFn.mock.calls.filter(call => call[0] === 'updateNewsletterPreference');
        expect(updateCalls).toHaveLength(1);
    });
});
