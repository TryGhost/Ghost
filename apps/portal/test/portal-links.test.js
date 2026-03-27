import App from '../src/app';
import {site as FixtureSite, member as FixtureMember} from './utils/test-fixtures';
import {appRender, fireEvent, waitFor, within} from './utils/test-utils';
import setupGhostApi from '../src/utils/api';

const setup = async ({site, member = null, showPopup = true}) => {
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
    });
});
