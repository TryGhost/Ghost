import {fireEvent, render, waitFor} from '../../../utils/test-utils';
import GiftRedemptionPage from '../../../../src/components/pages/gift-redemption-page';
import {member, testSite} from '../../../../src/utils/fixtures';

const gift = {
    cadence: 'year',
    duration: 1,
    tier: {
        id: 'tier_1',
        name: 'Premium',
        description: 'Premium tier',
        benefits: ['Premium articles', 'Members-only newsletter']
    }
};

const renderGiftRedemptionPage = (overrideContext = {}) => {
    return render(<GiftRedemptionPage />, {
        overrideContext: {
            site: {
                ...testSite,
                url: 'https://example.com/',
                labs: {
                    giftSubscriptions: true
                }
            },
            pageData: {
                token: 'gift-token-123',
                gift
            },
            member: null,
            ...overrideContext
        }
    });
};

describe('GiftRedemptionPage', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/#/portal/gift/redeem/gift-token-123');
    });

    test('lets a logged-in member redeem without rendering the form', () => {
        const {queryByLabelText, getByRole, mockDoActionFn} = renderGiftRedemptionPage({
            member: member.free
        });

        expect(queryByLabelText(/your name/i)).not.toBeInTheDocument();
        expect(queryByLabelText(/your email/i)).not.toBeInTheDocument();

        fireEvent.click(getByRole('button', {name: 'Redeem gift membership'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
            giftToken: 'gift-token-123'
        });
    });

    test('shows validation errors for anonymous visitors and only submits once valid', async () => {
        const {getByLabelText, getByRole, mockDoActionFn, getByText} = renderGiftRedemptionPage();
        const emailInput = getByLabelText(/your email/i);
        const submitButton = getByRole('button', {name: 'Redeem gift membership'});

        fireEvent.click(submitButton);
        expect(getByText('Enter your email address')).toBeInTheDocument();
        expect(mockDoActionFn).not.toHaveBeenCalled();

        fireEvent.change(emailInput, {target: {value: 'not-an-email'}});
        fireEvent.click(submitButton);
        expect(getByText('Invalid email address')).toBeInTheDocument();
        expect(mockDoActionFn).not.toHaveBeenCalled();

        fireEvent.change(getByLabelText(/your name/i), {target: {value: 'Jamie Larson'}});
        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
                email: 'jamie@example.com',
                name: 'Jamie Larson',
                giftToken: 'gift-token-123'
            });
        });
    });

    test('submits on Enter for anonymous visitors', async () => {
        const {getByLabelText, mockDoActionFn} = renderGiftRedemptionPage();
        const emailInput = getByLabelText(/your email/i);

        fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});
        fireEvent.keyDown(emailInput, {keyCode: 13});

        await waitFor(() => {
            expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
                email: 'jamie@example.com',
                name: '',
                giftToken: 'gift-token-123'
            });
        });
    });

    test('opens an error notification and closes the popup when gift data is missing', async () => {
        const {mockDoActionFn} = renderGiftRedemptionPage({
            pageData: {
                token: 'gift-token-123',
                gift: null
            }
        });

        await waitFor(() => {
            expect(mockDoActionFn).toHaveBeenCalledWith('openNotification', {
                action: 'giftRedemption:failed',
                status: 'error',
                autoHide: false,
                closeable: true,
                message: {
                    title: 'Gift could not be redeemed',
                    subtitle: 'Gift link is not valid'
                }
            });
        });

        expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
    });

    test('removes the portal link and closes the popup when gift subscriptions are disabled', async () => {
        const pushStateSpy = vi.spyOn(window.history, 'pushState');
        const {mockDoActionFn} = renderGiftRedemptionPage({
            site: {
                ...testSite,
                url: 'https://example.com/',
                labs: {}
            }
        });

        await waitFor(() => {
            expect(pushStateSpy).toHaveBeenCalled();
            expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
        });
    });
});
