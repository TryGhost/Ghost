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
});
