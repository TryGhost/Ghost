import {site as FixturesSite, member as FixtureMember} from '../utils/test-fixtures';
const {formSubmitHandler, planClickHandler} = require('../data-attributes');

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

describe('Data attributes:', () => {
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
    });
    test('data-members-form: allows free signup', () => {
        const {event, form, errorEl, siteUrl, submitHandler} = getMockData();

        formSubmitHandler({event, form, errorEl, siteUrl, submitHandler});

        expect(window.fetch).toHaveBeenCalledTimes(1);

        expect(window.fetch).toHaveBeenCalledWith('https://portal.localhost/members/api/send-magic-link/', {body: '{"email":"jamie@example.com","emailType":"signup","labels":["Gold"],"name":"Jamie Larsen"}', headers: {'Content-Type': 'application/json'}, method: 'POST'});
    });

    test('data-members-plan: allows new member paid signup via direct checkout', async () => {
        const {event, errorEl, siteUrl, clickHandler, site, member, element} = getMockData();

        const paidTier = site.products.find(p => p.type === 'paid');
        const plan = paidTier.monthlyPrice.id;

        await planClickHandler({event, errorEl, siteUrl, clickHandler, site, member, el: element});
        expect(window.fetch).toHaveBeenNthCalledWith(1,
            'https://portal.localhost/members/api/session', {
                credentials: 'same-origin'
            }
        );
        expect(window.fetch).toHaveBeenNthCalledWith(2,
            'https://portal.localhost/members/api/create-stripe-checkout-session/', {
                body: `{"priceId":"${plan}","identity":"session-identity","successUrl":"https://portal.localhost/success","cancelUrl":"https://portal.localhost/cancel","metadata":{}}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            }
        );
    });

    test('data-members-plan: allows free member upgrade via direct checkout', async () => {
        let {event, errorEl, siteUrl, clickHandler, site, member, element} = getMockData();
        member = FixtureMember.free;
        const paidTier = site.products.find(p => p.type === 'paid');
        const plan = paidTier.monthlyPrice.id;

        await planClickHandler({event, errorEl, siteUrl, clickHandler, site, member, el: element});
        expect(window.fetch).toHaveBeenNthCalledWith(1, 'https://portal.localhost/members/api/session', {
            credentials: 'same-origin'
        });
        expect(window.fetch).toHaveBeenNthCalledWith(2, 'https://portal.localhost/members/api/create-stripe-checkout-session/', {
            body: `{"priceId":"${plan}","identity":"session-identity","successUrl":"https://portal.localhost/success","cancelUrl":"https://portal.localhost/cancel","metadata":{"checkoutType":"upgrade"}}`,
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    });
});
