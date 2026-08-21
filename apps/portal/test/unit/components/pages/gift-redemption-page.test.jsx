import {fireEvent, render, waitFor} from '../../../utils/test-utils';
import GiftRedemptionPage from '../../../../src/components/pages/gift-redemption-page';
import BetaGiftRedemptionPage from '../../../../src/components/pages/beta-gift-redemption-page';
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

const renderGiftRedemptionPage = (Page, overrideContext = {}) => {
    return render(<Page />, {
        overrideContext: {
            site: {
                ...testSite,
                url: 'https://example.com/'
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

describe.each([
    {name: 'GiftRedemptionPage', Page: GiftRedemptionPage, buttonLabel: 'Redeem your membership'},
    {name: 'BetaGiftRedemptionPage', Page: BetaGiftRedemptionPage, buttonLabel: 'Redeem your gift'}
])('$name', ({Page, buttonLabel}) => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/#/portal/gift/redeem/gift-token-123');
    });

    test('lets a logged-in member redeem without rendering the form', () => {
        const {queryByLabelText, getByRole, mockDoActionFn} = renderGiftRedemptionPage(Page, {
            member: member.free
        });

        expect(queryByLabelText(/your name/i)).not.toBeInTheDocument();
        expect(queryByLabelText(/your email/i)).not.toBeInTheDocument();

        fireEvent.click(getByRole('button', {name: buttonLabel}));

        expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
            giftToken: 'gift-token-123'
        });
    });

    test('shows validation errors for anonymous visitors and only submits once valid', async () => {
        const {getByLabelText, getByRole, mockDoActionFn, getByText} = renderGiftRedemptionPage(Page);
        const emailInput = getByLabelText(/your email/i);
        const submitButton = getByRole('button', {name: buttonLabel});

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
        const {getByLabelText, mockDoActionFn} = renderGiftRedemptionPage(Page);
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
        const {mockDoActionFn} = renderGiftRedemptionPage(Page, {
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
                    subtitle: 'This gift link is invalid.'
                }
            });
        });

        expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
    });
});

describe('BetaGiftRedemptionPage', () => {
    test('presents the buyer details and prefills the intended recipient name', () => {
        const personalizedGift = {
            ...gift,
            buyer_name: 'Jamie',
            recipient_name: 'Taylor',
            message: 'Enjoy this!',
            expires_at: '2030-01-01T00:00:00.000Z'
        };
        const {container, getByLabelText, getByTestId, getByText} = renderGiftRedemptionPage(BetaGiftRedemptionPage, {
            site: {
                ...testSite,
                url: 'https://example.com/',
                locale: 'en-GB',
                timezone: 'America/Los_Angeles'
            },
            pageData: {
                token: 'gift-token-123',
                gift: personalizedGift
            }
        });

        expect(getByLabelText(/your name/i)).toHaveValue('Taylor');
        expect(getByLabelText(/your email/i)).toHaveFocus();
        expect(container.querySelector('.gh-portal-gift-checkout-subtitle')).toHaveTextContent('Jamie has gifted you a 1-year Premium membership to The Blueprint');
        expect(getByTestId('gift-message')).toHaveTextContent('Enjoy this!');
        expect(getByTestId('gift-message')).toHaveTextContent('Jamie');
        expect(getByText(/This gift can only be redeemed once and expires on/i)).toBeInTheDocument();
    });

    test('presents the claim deadline in the publication locale and timezone', () => {
        const personalizedGift = {
            ...gift,
            expires_at: '2030-01-01T01:00:00.000Z'
        };
        const {getByText} = renderGiftRedemptionPage(BetaGiftRedemptionPage, {
            site: {
                ...testSite,
                locale: 'en-GB',
                timezone: 'America/Los_Angeles'
            },
            pageData: {
                token: 'gift-token-123',
                gift: personalizedGift
            }
        });

        expect(getByText(/expires on 31 Dec 2029\./i)).toBeInTheDocument();
    });
});
