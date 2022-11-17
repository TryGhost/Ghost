import App from '../App';
import {site as FixturesSite, member as FixtureMember} from '../utils/test-fixtures';
import {fireEvent, appRender, within} from '../utils/test-utils';
import setupGhostApi from '../utils/api';
import * as helpers from '../utils/helpers';
import {formSubmitHandler, planClickHandler} from '../data-attributes';

// Mock data
function getMockData() {
    const site = FixturesSite.singleTier.basic;
    const member = null;

    const errorEl = {
        innerText: ''
    };
    const siteUrl = 'https://portal.localhost';
    const submitHandler = () => {};
    const clickHandler = () => {};
    const form = {
        removeEventListener: () => {},
        classList: {
            remove: () => {},
            add: () => {}
        },
        dataset: {
            membersForm: 'signup'
        },
        addEventListener: () => {}
    };

    const element = {
        removeEventListener: () => {},
        dataset: {
            membersPlan: 'monthly',
            membersSuccess: 'https://portal.localhost/success',
            membersCancel: 'https://portal.localhost/cancel'
        },
        classList: {
            remove: () => {},
            add: () => {}
        },
        addEventListener: () => {}
    };

    const event = {
        preventDefault: () => {},
        target: {
            querySelector: (elem) => {
                if (elem === 'input[data-members-email]') {
                    return {
                        value: 'jamie@example.com'
                    };
                }
                if (elem === 'input[data-members-name]') {
                    return {
                        value: 'Jamie Larsen'
                    };
                }
            },
            querySelectorAll: (elem) => {
                if (elem === 'input[data-members-label]') {
                    return [{
                        value: 'Gold'
                    }];
                }
            }
        }
    };

    return {
        event, form, siteUrl, submitHandler, errorEl, clickHandler, site, member, element
    };
}

describe('Member Data attributes:', () => {
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

        // Mock url history method
        jest.spyOn(helpers, 'getUrlHistory').mockImplementation(() => {
            return [{
                path: '/blog/',
                refMedium: null,
                refSource: 'ghost-explore',
                refUrl: 'https://example.com/blog/',
                time: 1611234567890
            }];
        });

        // Mock window.location
        let locationMock = jest.fn();
        delete window.location;
        window.location = {assign: locationMock};
        window.location.href = (new URL('https://portal.localhost')).href;
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('data-members-form', () => {
        test('allows free signup', () => {
            const {event, form, errorEl, siteUrl, submitHandler} = getMockData();

            formSubmitHandler({event, form, errorEl, siteUrl, submitHandler});

            expect(window.fetch).toHaveBeenCalledTimes(1);
            const expectedBody = JSON.stringify({
                email: 'jamie@example.com',
                emailType: 'signup',
                labels: ['Gold'],
                name: 'Jamie Larsen',
                autoRedirect: true,
                urlHistory: [{
                    path: '/blog/',
                    refMedium: null,
                    refSource: 'ghost-explore',
                    refUrl: 'https://example.com/blog/',
                    time: 1611234567890
                }]
            });
            expect(window.fetch).toHaveBeenCalledWith('https://portal.localhost/members/api/send-magic-link/', {body: expectedBody, headers: {'Content-Type': 'application/json'}, method: 'POST'});
        });
    });

    describe('data-members-plan', () => {
        test('allows new member paid signup via direct checkout', async () => {
            const {event, errorEl, siteUrl, clickHandler, site, member, element} = getMockData();

            const paidTier = site.products.find(p => p.type === 'paid');

            await planClickHandler({event, errorEl, siteUrl, clickHandler, site, member, el: element});
            expect(window.fetch).toHaveBeenNthCalledWith(1,
                'https://portal.localhost/members/api/session', {
                    credentials: 'same-origin'
                }
            );
            const expectedBody = {
                cadence: 'month',
                tierId: paidTier.id,
                identity: 'session-identity',
                successUrl: 'https://portal.localhost/success',
                cancelUrl: 'https://portal.localhost/cancel',
                metadata: {
                    urlHistory: [{
                        path: '/blog/',
                        refMedium: null,
                        refSource: 'ghost-explore',
                        refUrl: 'https://example.com/blog/',
                        time: 1611234567890
                    }]
                }
            };
            expect(window.fetch).toHaveBeenNthCalledWith(2,
                'https://portal.localhost/members/api/create-stripe-checkout-session/', {
                    body: JSON.stringify(expectedBody),
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: 'POST'
                }
            );
        });
    });

    describe('data-members-plan', () => {
        test('allows free member upgrade via direct checkout', async () => {
            let {event, errorEl, siteUrl, clickHandler, site, member, element} = getMockData();
            member = FixtureMember.free;
            const paidTier = site.products.find(p => p.type === 'paid');

            await planClickHandler({event, errorEl, siteUrl, clickHandler, site, member, el: element});
            expect(window.fetch).toHaveBeenNthCalledWith(1, 'https://portal.localhost/members/api/session', {
                credentials: 'same-origin'
            });
            const expectedBody = {
                cadence: 'month',
                tierId: paidTier.id,
                identity: 'session-identity',
                successUrl: 'https://portal.localhost/success',
                cancelUrl: 'https://portal.localhost/cancel',
                metadata: {
                    checkoutType: 'upgrade',
                    urlHistory: [{
                        path: '/blog/',
                        refMedium: null,
                        refSource: 'ghost-explore',
                        refUrl: 'https://example.com/blog/',
                        time: 1611234567890
                    }]
                }
            };
            expect(window.fetch).toHaveBeenNthCalledWith(2, 'https://portal.localhost/members/api/create-stripe-checkout-session/', {
                body: JSON.stringify(expectedBody),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            });
        });
    });
});

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

describe('Portal Data attributes:', () => {
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
        window.location.hash = '';
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('data-portal', () => {
        test('opens default portal page', async () => {
            document.body.innerHTML = `
                <div data-portal> </div>
            `;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixturesSite.singleTier.basic,
                showPopup: false
            });
            expect(popupFrame).not.toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            const portalElement = document.querySelector('[data-portal]');
            fireEvent.click(portalElement);
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
        });
    });

    describe('data-portal=signin', () => {
        test('opens Portal signin page', async () => {
            document.body.innerHTML = `
                <div data-portal="signin"> </div>
            `;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixturesSite.singleTier.basic,
                showPopup: false
            });
            expect(popupFrame).not.toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            const portalElement = document.querySelector('[data-portal]');
            fireEvent.click(portalElement);
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const loginTitle = within(popupFrame.contentDocument).queryByText(/sign in/i);
            expect(loginTitle).toBeInTheDocument();
        });
    });

    describe('data-portal=signup', () => {
        test('opens Portal signup page', async () => {
            document.body.innerHTML = `
                <div data-portal="signup"> </div>
            `;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixturesSite.singleTier.basic,
                showPopup: false
            });
            expect(popupFrame).not.toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            const portalElement = document.querySelector('[data-portal]');
            fireEvent.click(portalElement);
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const loginTitle = within(popupFrame.contentDocument).queryByText(/already a member/i);
            expect(loginTitle).toBeInTheDocument();
        });
    });

    describe('data-portal=signup/:tierid/monthly', () => {
        test('opens Portal signup page', async () => {
            const siteData = FixturesSite.singleTier.basic;
            const paidTier = siteData.products.find(p => p.type === 'paid');

            document.body.innerHTML = `
                <div data-portal="signup/${paidTier.id}/monthly"> </div>
            `;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixturesSite.singleTier.basic,
                showPopup: false
            });
            expect(popupFrame).not.toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            const portalElement = document.querySelector('[data-portal]');
            fireEvent.click(portalElement);
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
        });
    });

    describe('data-portal=account', () => {
        test('opens Portal account home page', async () => {
            document.body.innerHTML = `
                <div data-portal="account"> </div>
            `;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixturesSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(popupFrame).not.toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            const portalElement = document.querySelector('[data-portal]');
            fireEvent.click(portalElement);
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const accountHomeTitle = within(popupFrame.contentDocument).queryByText(/your account/i);
            expect(accountHomeTitle).toBeInTheDocument();
        });
    });

    describe('data-portal=account/plans', () => {
        test('opens Portal account plan page', async () => {
            document.body.innerHTML = `
                <div data-portal="account/plans"> </div>
            `;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixturesSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(popupFrame).not.toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            const portalElement = document.querySelector('[data-portal]');
            fireEvent.click(portalElement);
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const accountPlanTitle = within(popupFrame.contentDocument).queryByText(/choose a plan/i);
            expect(accountPlanTitle).toBeInTheDocument();
        });
    });

    describe('data-portal=account/profile', () => {
        test('opens Portal account profile page', async () => {
            document.body.innerHTML = `
                <div data-portal="account/profile"> </div>
            `;
            let {
                popupFrame, triggerButtonFrame, ...utils
            } = await setup({
                site: FixturesSite.singleTier.basic,
                member: FixtureMember.free,
                showPopup: false
            });
            expect(popupFrame).not.toBeInTheDocument();
            expect(triggerButtonFrame).toBeInTheDocument();
            const portalElement = document.querySelector('[data-portal]');
            fireEvent.click(portalElement);
            popupFrame = await utils.findByTitle(/portal-popup/i);
            expect(popupFrame).toBeInTheDocument();
            const accountProfileTitle = within(popupFrame.contentDocument).queryByText(/account settings/i);
            expect(accountProfileTitle).toBeInTheDocument();
        });
    });
});
