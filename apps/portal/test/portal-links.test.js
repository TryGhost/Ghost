import App from '../src/app';
import {site as FixtureSite, member as FixtureMember} from './utils/test-fixtures';
import {appRender, fireEvent, waitFor, within} from './utils/test-utils';
import setupGhostApi from '../src/utils/api';

const setup = async ({site, member = null, showPopup = true, redeemedMember = member}) => {
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

    ghostApi.member.redeemGift = vi.fn(() => {
        return Promise.resolve({success: true});
    });

    ghostApi.member.sessionData = vi.fn(() => {
        return Promise.resolve(redeemedMember);
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
    const giftToken = '31957440-38e2-48c1-baaa-8b48e9afe727';
    const emailedGiftToken = '9f5bd0d5-d0c0-4f4d-9690-6cbff9d1fe55';

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

            if (url.includes(`/members/api/gifts/${giftToken}`)) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        status: 'purchased',
                        delivery_method: 'link',
                        duration_months: 1,
                        claim_url: `https://example.com/#/portal/gift/${giftToken}`,
                        sender_email: 'alex@example.com',
                        recipient_email: null,
                        recipient_email_masked: null,
                        tier: {
                            id: 'tier_bronze',
                            name: 'Bronze'
                        }
                    })
                });
            }

            if (url.includes(`/members/api/gifts/${emailedGiftToken}`)) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        status: 'purchased',
                        delivery_method: 'email',
                        duration_months: 3,
                        claim_url: `https://example.com/#/portal/gift/${emailedGiftToken}`,
                        sender_email: 'alex@example.com',
                        recipient_email: 'jamie@example.com',
                        recipient_email_masked: 'ja***@example.com',
                        tier: {
                            id: 'tier_bronze',
                            name: 'Bronze'
                        }
                    })
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
        sessionStorage.clear();
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

    describe('#/portal/gift/:token', () => {
        test('opens the gift redeem page for UUID tokens', async () => {
            window.location.hash = `#/portal/gift/${giftToken}`;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const redeemTitle = within(popupFrame.contentDocument).queryByText(/redeem your gift/i);
                expect(redeemTitle).toBeInTheDocument();
            });
        });

        test('shows the redeem form with sender copy and a prefilled email for emailed gifts', async () => {
            window.location.hash = `#/portal/gift/${emailedGiftToken}`;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByText(/you've been gifted 3 months of/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByLabelText(/name/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByLabelText(/email/i)).toHaveValue('jamie@example.com');
                expect(within(popupIframeDocument).queryByRole('button', {name: /redeem gift/i})).toBeInTheDocument();
            });
        });

        test('shows check your email confirmation after submitting the redeem form', async () => {
            window.location.hash = `#/portal/gift/${giftToken}`;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByLabelText(/name/i)).toBeInTheDocument();
            });

            fireEvent.change(within(popupFrame.contentDocument).getByLabelText(/name/i), {target: {value: 'Jamie'}});
            fireEvent.change(within(popupFrame.contentDocument).getByLabelText(/email/i), {target: {value: 'jamie@example.com'}});
            fireEvent.click(within(popupFrame.contentDocument).getByRole('button', {name: /redeem gift/i}));

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByText(/check your email/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/we sent a sign-in link to jamie@example.com/i)).toBeInTheDocument();
            });

            const magicLinkCall = window.fetch.mock.calls.find(([url]) => url.includes(`/members/api/gifts/${giftToken}/send-magic-link/`));
            expect(magicLinkCall).toBeDefined();
            expect(JSON.parse(magicLinkCall[1].body)).toMatchObject({
                redirect: `https://portal.localhost/?gift=${giftToken}`
            });
        });

        test('auto redeems a gift after the signup magic-link redirect returns to the site', async () => {
            const replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
            const redeemedMember = {
                ...FixtureMember.complimentaryWithSubscription,
                paid: true,
                status: 'comped',
                comped: true,
                subscriptions: [{
                    id: '',
                    status: 'active',
                    tier: {
                        id: 'tier_bronze',
                        name: 'Bronze',
                        expiry_at: '2026-04-16T00:00:00.000Z'
                    },
                    price: {
                        amount: 0,
                        nickname: 'Gift subscription',
                        interval: 'year',
                        currency: 'usd',
                        product: {
                            id: '',
                            product_id: 'tier_bronze'
                        }
                    },
                    gift: {
                        id: 'gift_123',
                        duration_months: 1,
                        expires_at: '2026-04-16T00:00:00.000Z'
                    }
                }]
            };

            window.location.href = `https://portal.localhost/?gift=${giftToken}&success=true&action=signup`;
            window.location.search = `?gift=${giftToken}&success=true&action=signup`;
            window.location.hash = '';

            let {
                ghostApi, popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: FixtureMember.free,
                redeemedMember,
                showPopup: false
            });

            expect(triggerButtonFrame).toBeInTheDocument();
            expect(ghostApi.member.redeemGift).toHaveBeenCalledWith({token: giftToken});

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByText(/gift subscription/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/gift redeemed successfully/i)).toBeInTheDocument();
            });

            expect(replaceStateSpy).toHaveBeenCalled();
        });
    });

    describe('#/portal/gift', () => {
        test('opens the redesigned gift purchase page', async () => {
            window.location.hash = '#/portal/gift';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.multipleTiers.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByText(/give the gift/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/which plan/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/how many months/i)).toBeInTheDocument();
            });
        });

        test('hides the plan picker when only one paid tier is available', async () => {
            window.location.hash = '#/portal/gift';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByText(/which plan/i)).not.toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/how many months/i)).toBeInTheDocument();
            });
        });

        test('defaults to sharing by link and only shows recipient email when email delivery is selected', async () => {
            window.location.hash = '#/portal/gift';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByText(/share link/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/send by email/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByLabelText(/who should receive it/i)).not.toBeInTheDocument();
            });

            fireEvent.click(within(popupFrame.contentDocument).getByRole('button', {name: /send by email/i}));

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByLabelText(/who should receive it/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/will receive the gift by email/i)).toBeInTheDocument();
            });
        });
    });

    describe('#/portal/gift/success/:token', () => {
        test('shows the updated ready state with a copyable link for shared gifts', async () => {
            sessionStorage.setItem(`ghost-portal-gift-checkout:${giftToken}`, JSON.stringify({
                deliveryMethod: 'link',
                durationMonths: 1,
                tierName: 'Bronze'
            }));

            window.location.hash = `#/portal/gift/success/${giftToken}`;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const popupIframeDocument = popupFrame.contentDocument;
                expect(within(popupIframeDocument).queryByText(/your gift is ready/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/you have gifted 1 month of bronze/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByText(/gift preview/i)).toBeInTheDocument();
                expect(within(popupIframeDocument).queryByDisplayValue(`https://example.com/#/portal/gift/${giftToken}`)).toBeInTheDocument();
            });
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

        test('opens the gift redeem page via hashchange for UUID tokens', async () => {
            window.location.hash = '';
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixtureSite.singleTier.basic,
                member: null,
                showPopup: false
            });
            expect(triggerButtonFrame).toBeInTheDocument();

            window.location.hash = `#/portal/gift/${giftToken}`;
            window.dispatchEvent(new HashChangeEvent('hashchange'));

            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();

            await waitFor(() => {
                const redeemTitle = within(popupFrame.contentDocument).queryByText(/redeem your gift/i);
                expect(redeemTitle).toBeInTheDocument();
            });
        });
    });
});
