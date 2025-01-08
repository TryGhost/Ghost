import App from '../App';
import {site as FixtureSite, member as FixtureMember} from '../utils/test-fixtures';
import {appRender, within} from '../utils/test-utils';
import setupGhostApi from '../utils/api';

const setup = async ({site, member = null, showPopup = true}) => {
    const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
    ghostApi.init = jest.fn(() => {
        return Promise.resolve({
            site,
            member
        });
    });

    ghostApi.member.sendMagicLink = jest.fn(() => {
        return Promise.resolve('success');
    });

    ghostApi.member.checkoutPlan = jest.fn(() => {
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
        jest.spyOn(window, 'fetch').mockImplementation((url) => {
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
        jest.spyOn(window, 'Stripe').mockImplementation(() => {
            return {
                redirectToCheckout: () => {
                    return Promise.resolve({});
                }
            };
        });

        // Mock window.location
        let locationMock = jest.fn();
        delete window.location;
        window.location = {assign: locationMock};
        window.location.href = (new URL('https://portal.localhost')).href;
    });
    afterEach(() => {
        jest.restoreAllMocks();
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
        test('opens free signup page even if free plan is hidden', async () => {
            window.location.hash = '#/portal/signup/free';
            let {
                popupFrame, triggerButtonFrame, ...utils
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
});
