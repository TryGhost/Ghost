import App from '../src/app';
import {site as FixtureSite, member as FixtureMember} from './utils/test-fixtures';
import {appRender, fireEvent, waitFor, within} from './utils/test-utils';
import setupGhostApi from '../src/utils/api';

const defaultGiftResponse = {
    gifts: [
        {
            token: 'gift-token-123',
            cadence: 'year',
            duration: 1,
            tier: {
                id: 'tier-gift',
                name: 'Bronze',
                benefits: [
                    'Five great stories to read every day',
                    'Videos and podcasts to charm and delight you'
                ]
            }
        }
    ]
};

const setup = async ({site, member = null, showPopup = true, giftResponse = defaultGiftResponse, giftError = null}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

    ghostApi.init = vi.fn(() => {
        return Promise.resolve({
            site,
            member
        });
    });

    ghostApi.member.sendMagicLink = vi.fn(() => {
        return Promise.resolve('success');
    });

    ghostApi.member.getIntegrityToken = vi.fn(() => {
        return Promise.resolve('testtoken');
    });

    ghostApi.member.checkoutPlan = vi.fn(() => {
        return Promise.resolve();
    });

    ghostApi.member.sessionData = vi.fn(() => {
        return Promise.resolve(member);
    });

    ghostApi.gift.fetchRedemptionData = vi.fn(() => {
        if (giftError) {
            return Promise.reject(giftError);
        }

        return Promise.resolve(giftResponse);
    });

    ghostApi.gift.redeem = vi.fn(() => {
        return Promise.resolve({
            gifts: [{
                token: giftResponse.gifts[0].token,
                status: 'redeemed'
            }]
        });
    });

    const utils = appRender(
        <App api={ghostApi} showPopup={showPopup} />
    );

    const triggerButtonFrame = await utils.findByTitle(/portal-trigger/i);
    const popupFrame = utils.queryByTitle(/portal-popup/i);
    return {
        ghostApi,
        popupFrame,
        triggerButtonFrame,
        ...utils
    };
};

describe('Portal Data links:', () => {
    beforeEach(() => {
        // Mock global fetch
        vi.spyOn(window, 'fetch').mockImplementation((url) => {
            if (url.includes('send-magic-link')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({success: true})
                });
            }

            if (url.includes('api/session')) {
                return Promise.resolve({
                    ok: true,
                    text: async () => {
                        return 'session-identity';
                    }
                });
            }

            if (url.includes('create-stripe-checkout-session')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => {
                        return {
                            publicKey: 'key-xyz'
                        };
                    }
                });
            }
            return Promise.resolve({});
        });

        // Mock global Stripe
        window.Stripe = () => {};
        vi.spyOn(window, 'Stripe').mockImplementation(() => {
            return {
                redirectToCheckout: () => {
                    return Promise.resolve({});
                }
            };
        });

        // Mock window.location
        let locationMock = vi.fn();
        delete window.location;
        window.location = {assign: locationMock};
        window.location.href = (new URL('https://portal.localhost')).href;
    });
    afterEach(() => {
        vi.restoreAllMocks();
        window.location.hash = '';
    });
    describe('#/portal', () => {
        test('opens default portal page', async () => {
            window.location.hash = '#/portal';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const signupTitle = within(popupFrame.contentDocument).queryByText(/already a member/i);
            expect(signupTitle).toBeInTheDocument();
        });
    });

    describe('#/portal/signin', () => {
        test('opens portal signin page', async () => {
            window.location.hash = '#/portal/signin';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const loginTitle = within(popupFrame.contentDocument).queryByText(/sign in/i);
            expect(loginTitle).toBeInTheDocument();
        });
    });

    describe('#/portal/signup', () => {
        test('opens portal signup page', async () => {
            window.location.hash = '#/portal/signup';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const signupTitle = within(popupFrame.contentDocument).queryByText(/already a member/i);
            expect(signupTitle).toBeInTheDocument();
        });

        describe('on a paid-members only site', () => {
            describe('with only a free plan', () => {
                test('renders invite-only message and does not allow signups', async () => {
                    window.location.hash = '#/portal/signup';
                    let {
                        popupFrame
                    } = await setup({
                        site: {...FixtureSite.singleTier.onlyFreePlan, members_signup_access: 'paid'},
                        member: null
                    });

                    expect(popupFrame).toBeInTheDocument();

                    const inviteOnlyMessage = within(popupFrame.contentDocument).queryByText(/This site is invite-only/i);
                    expect(inviteOnlyMessage).toBeInTheDocument();
                });
            });

            describe('with paid plans', () => {
                test('allows paid signups', async () => {
                    window.location.hash = '#/portal/signup';

                    // Set up a paid-members only site with a free tier + 3 paid tiers
                    let {
                        popupFrame

                    } = await setup({
                        site: {...FixtureSite.multipleTiers.basic, members_signup_access: 'paid'},
                        member: null
                    });

                    expect(popupFrame).toBeInTheDocument();

                    const emailInput = within(popupFrame.contentDocument).getByLabelText(/email/i);
                    const nameInput = within(popupFrame.contentDocument).getByLabelText(/name/i);
                    const chooseBtns = within(popupFrame.contentDocument).queryAllByRole('button', {name: 'Choose'});

                    expect(emailInput).toBeInTheDocument();
                    expect(nameInput).toBeInTheDocument();

                    // There should be 3 choose buttons, one for each paid tier
                    expect(chooseBtns).toHaveLength(3);
                });
            });
        });
    });

    describe('#/share', () => {
        test('opens portal share page', async () => {
            window.location.hash = '#/share';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const shareTitle = within(popupFrame.contentDocument).queryByText(/^Share$/i);
            expect(shareTitle).toBeInTheDocument();
            const poweredBy = within(popupFrame.contentDocument).queryByText(/Powered by Ghost/i);
            expect(poweredBy).not.toBeInTheDocument();
        });
    });

    describe('#/portal/signup/free', () => {
        test('opens free signup page and completes signup even if free plan is hidden', async () => {
            window.location.hash = '#/portal/signup/free';
            let {
                ghostApi, popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.multipleTiers.onlyPaidPlans,
                member: null
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            const popupIframeDocument = popupFrame.contentDocument;
            const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
            const nameInput = within(popupIframeDocument).getByLabelText(/name/i);
            const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Sign up'});
            const signinButton = within(popupIframeDocument).getByRole('button', {name: 'Sign in'});
            expect(popupFrame).toBeInTheDocument();
            expect(emailInput).toBeInTheDocument();
            expect(nameInput).toBeInTheDocument();
            expect(submitButton).toBeInTheDocument();
            expect(signinButton).toBeInTheDocument();
            const signupTitle = within(popupFrame.contentDocument).queryByText(/already a member/i);
            expect(signupTitle).toBeInTheDocument();

            // Fill out and submit the signup form
            fireEvent.change(nameInput, {target: {value: 'Jamie Larsen'}});
            fireEvent.change(emailInput, {target: {value: 'jamie@example.com'}});

            expect(emailInput).toHaveValue('jamie@example.com');
            expect(nameInput).toHaveValue('Jamie Larsen');

            fireEvent.click(submitButton);

            // Verify success message is shown
            const magicLink = await within(popupIframeDocument).findByText(/now check your email/i);
            expect(magicLink).toBeInTheDocument();

            // Verify the API was called with correct parameters
            expect(ghostApi.member.sendMagicLink).toHaveBeenCalledWith({
                email: 'jamie@example.com',
                emailType: 'signup',
                name: 'Jamie Larsen',
                plan: 'free',
                integrityToken: 'testtoken'
            });
        });

        describe('on a paid-members only site', () => {
            test('renders paid-members only message and does not allow signups', async () => {
                window.location.hash = '#/portal/signup/free';
                let {
                    popupFrame
                } = await setup({
                    site: {...FixtureSite.multipleTiers.basic, members_signup_access: 'paid'},
                    member: null
                });

                expect(popupFrame).toBeInTheDocument();

                const paidMembersOnlyMessage = within(popupFrame.contentDocument).queryByText(/This site only accepts paid members/i);
                expect(paidMembersOnlyMessage).toBeInTheDocument();
            });
        });
    });

    describe('#/portal/account', () => {
        test('opens portal account home page', async () => {
            window.location.hash = '#/portal/account';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const accountHomeTitle = within(popupFrame.contentDocument).queryByText(/your account/i);
            expect(accountHomeTitle).toBeInTheDocument();
        });
    });

    describe('#/portal/account/plans', () => {
        test('opens portal account plan page', async () => {
            window.location.hash = '#/portal/account/plans';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const accountPlanTitle = within(popupFrame.contentDocument).queryByText(/choose a plan/i);
            expect(accountPlanTitle).toBeInTheDocument();
        });
    });

    describe('#/portal/account/profile', () => {
        test('opens portal account profile page', async () => {
            window.location.hash = '#/portal/account/profile';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const accountProfileTitle = within(popupFrame.contentDocument).queryByText(/account settings/i);
            expect(accountProfileTitle).toBeInTheDocument();
        });
    });

    describe('#/portal/account/newsletter/help', () => {
        test('opens portal newsletter receiving help page', async () => {
            window.location.hash = '#/portal/account/newsletters/help';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const helpPageTitle = within(popupFrame.contentDocument).queryByText(/help! i'm not receiving emails/i);
            expect(helpPageTitle).toBeInTheDocument();
        });
    });

    describe('#/portal/account/newsletter/disabled', () => {
        test('opens portal newsletter receiving help page', async () => {
            window.location.hash = '#/portal/account/newsletters/disabled';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const helpPageTitle = within(popupFrame.contentDocument).queryByText(/why has my email been disabled/i);
            expect(helpPageTitle).toBeInTheDocument();
        });
    });

    describe('#/portal/gift', () => {
        test('opens gift page when giftSubscriptions labs flag is enabled', async () => {
            window.location.hash = '#/portal/gift';

            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}},
                showPopup: false
            });

            expect(triggerButtonFrame).toBeInTheDocument();

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            const giftSubtitle = within(popupFrame.contentDocument).queryByText(/give the gift of a membership/i);
            expect(giftSubtitle).toBeInTheDocument();
        });

        test('does not open when giftSubscriptions labs flag is disabled', async () => {
            window.location.hash = '#/portal/gift';

            let {
                popupFrame, triggerButtonFrame
            } = await setup({
                site: {...FixtureSite.singleTier.basic, labs: {}},
                showPopup: false
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(popupFrame).not.toBeInTheDocument();
        });
    });

    describe('#/portal/gift/redeem/<token>', () => {
        const giftRedemptionHash = '#/portal/gift/redeem/gift-token-123';

        const setupGiftRedemption = async ({giftError = null, giftResponse = defaultGiftResponse} = {}) => {
            window.location.hash = giftRedemptionHash;

            return setup({
                site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}},
                member: FixtureMember.free,
                showPopup: false,
                giftError,
                giftResponse
            });
        };

        const expectGiftRedemptionErrorToast = async ({utils, subtitle}) => {
            const notificationFrame = await utils.findByTitle(/portal-notification/i);
            expect(notificationFrame).toBeInTheDocument();
            expect(utils.queryByTitle(/portal-popup/i)).not.toBeInTheDocument();

            const notificationIframeDocument = notificationFrame.contentDocument;
            expect(await within(notificationIframeDocument).findByText(/Gift could not be redeemed/i)).toBeInTheDocument();
            expect(within(notificationIframeDocument).queryByText(subtitle)).toBeInTheDocument();
        };

        test('renders a toast error when gift has expired', async () => {
            let {
                ghostApi, triggerButtonFrame, ...utils
            } = await setupGiftRedemption({
                giftError: new Error('This gift has expired.')
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(ghostApi.gift.fetchRedemptionData).toHaveBeenCalledWith({token: 'gift-token-123'});

            await expectGiftRedemptionErrorToast({
                utils,
                subtitle: /This gift has expired\./i
            });
        });

        test('renders a toast error when gift has already been redeemed', async () => {
            let {
                ghostApi, triggerButtonFrame, ...utils
            } = await setupGiftRedemption({
                giftError: new Error('This gift has already been redeemed.')
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(ghostApi.gift.fetchRedemptionData).toHaveBeenCalledWith({token: 'gift-token-123'});

            await expectGiftRedemptionErrorToast({
                utils,
                subtitle: /This gift has already been redeemed\./i
            });
        });

        test('renders a toast error when logged-in member already has an active subscription', async () => {
            let {
                ghostApi, triggerButtonFrame, ...utils
            } = await setupGiftRedemption({
                giftError: new Error('You already have an active subscription.')
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(ghostApi.gift.fetchRedemptionData).toHaveBeenCalledWith({token: 'gift-token-123'});

            await expectGiftRedemptionErrorToast({
                utils,
                subtitle: /You already have an active subscription\./i
            });
        });

        test('renders a toast error when gift link is invalid', async () => {
            let {
                ghostApi, triggerButtonFrame, ...utils
            } = await setupGiftRedemption({
                giftError: new Error('Failed to load gift data')
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(ghostApi.gift.fetchRedemptionData).toHaveBeenCalledWith({token: 'gift-token-123'});

            await expectGiftRedemptionErrorToast({
                utils,
                subtitle: /Gift link is not valid/i
            });
        });

        test('renders gift redemption popup without name/email inputs for a logged-in free member', async () => {
            let {
                ghostApi, popupFrame, triggerButtonFrame, ...utils
            } = await setupGiftRedemption();

            expect(triggerButtonFrame).toBeInTheDocument();

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            const popupIframeDocument = popupFrame.contentDocument;
            expect(await within(popupIframeDocument).findByText(/You've been gifted a membership/i)).toBeInTheDocument();
            expect(within(popupIframeDocument).queryByText(/Bronze/i)).toBeInTheDocument();
            expect(within(popupIframeDocument).queryByText(/1 year/i)).toBeInTheDocument();
            expect(within(popupIframeDocument).queryByText(/Five great stories to read every day/i)).toBeInTheDocument();
            expect(within(popupIframeDocument).queryByLabelText(/your name/i)).not.toBeInTheDocument();
            expect(within(popupIframeDocument).queryByLabelText(/your email/i)).not.toBeInTheDocument();
            expect(popupIframeDocument.querySelector('.gh-gift-redemption-form')).not.toBeInTheDocument();
            expect(ghostApi.gift.fetchRedemptionData).toHaveBeenCalledWith({token: 'gift-token-123'});
        });

        test('renders name/email inputs for an anonymous visitor', async () => {
            window.location.hash = giftRedemptionHash;

            let {
                ghostApi, popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}},
                member: null,
                showPopup: false
            });

            expect(triggerButtonFrame).toBeInTheDocument();

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            const popupIframeDocument = popupFrame.contentDocument;
            expect(within(popupIframeDocument).getByLabelText(/your name/i)).toBeInTheDocument();
            expect(within(popupIframeDocument).getByLabelText(/your email/i)).toBeInTheDocument();
            expect(ghostApi.gift.fetchRedemptionData).toHaveBeenCalledWith({token: 'gift-token-123'});
        });

        // TODO for GA: Remove test
        test('does not open when giftSubscriptions labs flag is disabled', async () => {
            window.location.hash = '#/portal/gift/redeem/gift-token-123';

            let {
                ghostApi, popupFrame, triggerButtonFrame
            } = await setup({
                site: {...FixtureSite.singleTier.basic, labs: {}},
                showPopup: false
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(popupFrame).not.toBeInTheDocument();
            expect(ghostApi.gift.fetchRedemptionData).not.toHaveBeenCalled();
        });
    });

    describe('?stripe=gift-purchase-success', () => {
        test('opens gift success page when giftSubscriptions labs flag is enabled', async () => {
            window.location.href = 'https://portal.localhost/?stripe=gift-purchase-success&gift_token=abc123';
            window.location.search = '?stripe=gift-purchase-success&gift_token=abc123';
            window.location.hash = '';
            window.location.pathname = '/';

            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}},
                showPopup: false
            });

            expect(triggerButtonFrame).toBeInTheDocument();

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            const giftTitle = within(popupFrame.contentDocument).queryByText(/gift ready to share/i);
            expect(giftTitle).toBeInTheDocument();

            const redeemUrl = within(popupFrame.contentDocument).queryByText(/#\/portal\/gift\/redeem\/abc123/);
            expect(redeemUrl).toBeInTheDocument();
        });

        test('does not open gift success page when gift_token is missing', async () => {
            window.location.href = 'https://portal.localhost/?stripe=gift-purchase-success';
            window.location.search = '?stripe=gift-purchase-success';
            window.location.hash = '';
            window.location.pathname = '/';

            let {
                popupFrame, triggerButtonFrame
            } = await setup({
                site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}},
                showPopup: false
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(popupFrame).not.toBeInTheDocument();
        });
    });

    describe('unauthenticated account page access', () => {
        test.each([
            {path: 'account', label: 'account'},
            {path: 'account/plans', label: 'account/plans'},
            {path: 'account/profile', label: 'account/profile'},
            {path: 'account/newsletters', label: 'account/newsletters'}
        ])('#/portal/$label redirects to signin with redirect URL when not logged in', async ({path}) => {
            window.location.hash = `#/portal/${path}`;
            let {
                ghostApi, popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: null,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            // Should show signin page instead of account page
            const popupIframeDocument = popupFrame.contentDocument;
            const signinTitle = within(popupIframeDocument).queryByText(/sign in/i);
            expect(signinTitle).toBeInTheDocument();

            // Fill in email and submit to verify the redirect URL is passed through
            const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
            const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});
            fireEvent.change(emailInput, {target: {value: 'test@example.com'}});
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(ghostApi.member.sendMagicLink).toHaveBeenCalledWith(
                    expect.objectContaining({
                        email: 'test@example.com',
                        emailType: 'signin',
                        redirect: `https://portal.localhost#/portal/${path}/`
                    })
                );
            });
        });
    });

    describe('hashchange account page access', () => {
        test.each([
            {path: 'account', expectedText: /your account/i},
            {path: 'account/plans', expectedText: /choose a plan/i},
            {path: 'account/profile', expectedText: /account settings/i}
        ])('#/portal/$path opens account page via hashchange when logged in', async ({path, expectedText}) => {
            // Start with no hash — simulates an already-loaded page
            window.location.hash = '';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();

            // Navigate via hash change (e.g. clicking <a href="#/portal/account/profile">)
            window.location.hash = `#/portal/${path}`;
            window.dispatchEvent(new HashChangeEvent('hashchange'));

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            const pageTitle = within(popupFrame.contentDocument).queryByText(expectedText);
            expect(pageTitle).toBeInTheDocument();
        });

        test.each([
            {path: 'account', label: 'account'},
            {path: 'account/plans', label: 'account/plans'},
            {path: 'account/profile', label: 'account/profile'},
            {path: 'account/newsletters', label: 'account/newsletters'}
        ])('#/portal/$label redirects to signin via hashchange when not logged in', async ({path}) => {
            // Start with no hash — simulates an already-loaded page
            window.location.hash = '';
            let {
                ghostApi, popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: null,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();

            // Now navigate via hash change (e.g. clicking <a href="#/portal/account/profile">)
            window.location.hash = `#/portal/${path}`;
            window.dispatchEvent(new HashChangeEvent('hashchange'));

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            // Should show signin page instead of account page
            const popupIframeDocument = popupFrame.contentDocument;
            const signinTitle = within(popupIframeDocument).queryByText(/sign in/i);
            expect(signinTitle).toBeInTheDocument();

            // Fill in email and submit to verify the redirect URL is passed through
            const emailInput = within(popupIframeDocument).getByLabelText(/email/i);
            const submitButton = within(popupIframeDocument).getByRole('button', {name: 'Continue'});
            fireEvent.change(emailInput, {target: {value: 'test@example.com'}});
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(ghostApi.member.sendMagicLink).toHaveBeenCalledWith(
                    expect.objectContaining({
                        email: 'test@example.com',
                        emailType: 'signin',
                        redirect: `https://portal.localhost#/portal/${path}/`
                    })
                );
            });
        });
    });
});
