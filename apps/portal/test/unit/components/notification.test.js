import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {vi} from 'vitest';
import Notification from '../../../src/components/notification';
import AppContext from '../../../src/app-context';
import NotificationParser, {clearURLParams} from '../../../src/utils/notifications';

vi.mock('../../../src/components/frame', () => ({
    default: ({children}) => <div data-testid="portal-notification-frame">{children}</div>
}));

vi.mock('../../../src/utils/notifications', () => ({
    default: vi.fn(() => null),
    clearURLParams: vi.fn()
}));

describe('Notification', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    test('remounts notification content when notification count changes', async () => {
        const doAction = vi.fn();
        const site = {
            url: 'https://example.com',
            title: 'Example Site'
        };

        const {container, getByText, rerender} = render(
            <AppContext.Provider value={{
                site,
                member: null,
                brandColor: '#000000',
                showPopup: false,
                doAction,
                notification: {
                    type: 'giftRedemption:failed',
                    status: 'error',
                    message: 'First notification',
                    autoHide: true,
                    duration: 100,
                    count: 0
                }
            }}
            >
                <Notification />
            </AppContext.Provider>
        );

        await waitFor(() => {
            expect(getByText('First notification')).toBeInTheDocument();
        });

        rerender(
            <AppContext.Provider value={{
                site,
                member: null,
                brandColor: '#000000',
                showPopup: false,
                doAction,
                notification: {
                    type: 'giftRedemption:failed',
                    status: 'error',
                    message: 'Second notification',
                    autoHide: false,
                    duration: 100,
                    count: 1
                }
            }}
            >
                <Notification />
            </AppContext.Provider>
        );

        await waitFor(() => {
            expect(getByText('Second notification')).toBeInTheDocument();
        });

        await act(async () => {
            vi.advanceTimersByTime(150);
        });

        expect(container.querySelector('.gh-portal-notification')).not.toHaveClass('slideout');
    });

    test('clears auth params for gift redemption URL notifications', async () => {
        NotificationParser.mockReturnValue({
            type: 'giftRedeem',
            status: 'success',
            message: 'Gift redeemed! You\'re all set.',
            autoHide: true,
            duration: 5000
        });

        const doAction = vi.fn();
        const site = {
            url: 'https://example.com',
            title: 'Example Site'
        };

        const {container, getByText} = render(
            <AppContext.Provider value={{
                site,
                member: null,
                brandColor: '#000000',
                showPopup: true,
                doAction,
                notification: null
            }}
            >
                <Notification />
            </AppContext.Provider>
        );

        await waitFor(() => {
            expect(getByText('Gift redeemed! You\'re all set.')).toBeInTheDocument();
        });

        fireEvent.click(container.querySelector('.gh-portal-notification-closeicon'));

        expect(clearURLParams).toHaveBeenCalledWith(['action', 'success', 'giftRedemption']);
        expect(doAction).toHaveBeenCalledWith('refreshMemberData');
    });

    test('does not slide out immediately when popup is open for gift redemption URL notifications', async () => {
        NotificationParser.mockReturnValue({
            type: 'giftRedeem',
            status: 'success',
            message: 'Gift redeemed! You\'re all set.',
            autoHide: true,
            duration: 5000
        });

        const doAction = vi.fn();
        const site = {
            url: 'https://example.com',
            title: 'Example Site'
        };

        const {container, getByText} = render(
            <AppContext.Provider value={{
                site,
                member: null,
                brandColor: '#000000',
                showPopup: true,
                doAction,
                notification: null
            }}
            >
                <Notification />
            </AppContext.Provider>
        );

        await waitFor(() => {
            expect(getByText('Gift redeemed! You\'re all set.')).toBeInTheDocument();
        });

        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        expect(container.querySelector('.gh-portal-notification')).not.toHaveClass('slideout');
    });
});
