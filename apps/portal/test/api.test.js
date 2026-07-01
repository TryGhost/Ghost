import setupGhostApi from '../src/utils/api';
import {HumanReadableError} from '../src/utils/errors';
import {vi} from 'vitest';

describe('Portal API gift redemption', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test('returns the gifts api payload for redeemable gift tokens', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

        vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            gifts: [{
                token: 'gift-token-123'
            }]
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        }));

        const response = await ghostApi.gift.fetchRedemptionData({token: 'gift-token-123'});

        expect(response.gifts[0].token).toBe('gift-token-123');
        expect(window.fetch).toHaveBeenCalledWith('https://example.com/members/api/gifts/gift-token-123/redeem/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: undefined
        });
    });

    test('throws a human-readable error for 400 members api gift responses', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

        vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            errors: [{
                message: 'This gift has expired.'
            }]
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        }));

        await expect(ghostApi.gift.fetchRedemptionData({token: 'gift-token-123'})).rejects.toEqual(new HumanReadableError('This gift has expired.'));
    });

    test('preserves the api error message for 404 members api gift responses', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

        vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            errors: [{
                message: 'Gift not found.'
            }]
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        }));

        await expect(ghostApi.gift.fetchRedemptionData({token: 'gift-token-123'})).rejects.toEqual(new HumanReadableError('Gift not found.'));
    });

    test('redeems a gift for a logged-in member via POST', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

        vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            gifts: [{
                token: 'gift-token-123',
                status: 'redeemed',
                consumes_at: '2030-01-01T00:00:00.000Z'
            }]
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        }));

        const response = await ghostApi.gift.redeem({token: 'gift-token-123'});

        expect(response.gifts[0].status).toBe('redeemed');
        expect(window.fetch).toHaveBeenCalledWith('https://example.com/members/api/gifts/gift-token-123/redeem/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: '{}'
        });
    });

    test('throws a human-readable error for 400 members api gift redeem responses', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

        vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
            errors: [{
                message: 'This gift has already been redeemed.'
            }]
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        }));

        await expect(ghostApi.gift.redeem({token: 'gift-token-123'})).rejects.toEqual(new HumanReadableError('This gift has already been redeemed.'));
    });
});

describe('Portal API gift checkout', () => {
    let originalLocation;

    beforeEach(() => {
        vi.restoreAllMocks();
        originalLocation = window.location;
        delete window.location;
        window.location = {
            href: 'https://example.com/#/portal/gift',
            assign: vi.fn()
        };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    test('passes customer email when creating a gift checkout session', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

        vi.spyOn(window, 'fetch').mockImplementation((url) => {
            if (url.includes('/members/api/session/')) {
                return Promise.resolve(new Response('identity-token', {status: 200}));
            }

            return Promise.resolve(new Response(JSON.stringify({
                url: 'https://checkout.stripe.com/gift-session'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }));
        });

        await ghostApi.member.checkoutGift({
            tierId: 'tier_123',
            cadence: 'month',
            email: 'jamie@example.com'
        });

        expect(window.fetch).toHaveBeenLastCalledWith('https://example.com/members/api/create-stripe-checkout-session/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identity: 'identity-token',
                metadata: {
                    requestSrc: 'portal'
                },
                type: 'gift',
                tierId: 'tier_123',
                cadence: 'month',
                cancelUrl: 'https://example.com/#/portal/gift',
                customerEmail: 'jamie@example.com'
            })
        });
        expect(window.location.assign).toHaveBeenCalledWith('https://checkout.stripe.com/gift-session');
    });
});

describe('Portal API member checkout', () => {
    let originalLocation;

    beforeEach(() => {
        vi.restoreAllMocks();
        originalLocation = window.location;
        delete window.location;
        window.location = {
            href: 'https://example.com/#/portal/offers/offer_123',
            assign: vi.fn()
        };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    test('preserves checkout session error code', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});

        vi.spyOn(window, 'fetch').mockImplementation((url) => {
            if (url.includes('/members/api/session/')) {
                return Promise.resolve(new Response('identity-token', {status: 200}));
            }

            return Promise.resolve(new Response(JSON.stringify({
                errors: [{
                    message: 'A subscription exists for this Member.',
                    code: 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION'
                }]
            }), {
                status: 403,
                headers: {
                    'Content-Type': 'application/json'
                }
            }));
        });

        await expect(ghostApi.member.checkoutPlan({
            plan: 'price_123',
            tierId: 'tier_123',
            cadence: 'month',
            email: 'jamie@example.com',
            offerId: 'offer_123'
        })).rejects.toMatchObject({
            message: 'A subscription exists for this Member.',
            code: 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION'
        });
    });
});

describe('Portal API plan checkout', () => {
    let originalLocation;

    const mockCheckoutFetch = () => {
        vi.spyOn(window, 'fetch').mockImplementation((url) => {
            if (url.includes('/members/api/session/')) {
                return Promise.resolve(new Response('identity-token', {status: 200}));
            }

            return Promise.resolve(new Response(JSON.stringify({
                url: 'https://checkout.stripe.com/plan-session'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }));
        });
    };

    const lastCheckoutBody = () => {
        const call = window.fetch.mock.calls.find(([url]) => url.includes('/members/api/create-stripe-checkout-session/'));
        return JSON.parse(call[1].body);
    };

    beforeEach(() => {
        vi.restoreAllMocks();
        originalLocation = window.location;
        delete window.location;
        window.location = {
            href: 'https://example.com/paid-article/',
            assign: vi.fn()
        };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    test('derives a contextual successUrl from the current page when none is supplied', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        mockCheckoutFetch();

        await ghostApi.member.checkoutPlan({
            plan: 'price_123',
            tierId: 'tier_123',
            cadence: 'month'
        });

        const body = lastCheckoutBody();
        expect(body.successUrl).toBe('https://example.com/paid-article/?stripe=success');
        expect(body.cancelUrl).toBe('https://example.com/paid-article/?stripe=cancel');
    });

    test('falls back to the site root when the current page is off-site', async () => {
        window.location.href = 'https://evil.example.org/phishing/';
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        mockCheckoutFetch();

        await ghostApi.member.checkoutPlan({
            plan: 'price_123',
            tierId: 'tier_123',
            cadence: 'month'
        });

        const body = lastCheckoutBody();
        expect(body.successUrl).toBe('https://example.com/?stripe=success');
        expect(body.cancelUrl).toBe('https://example.com/?stripe=cancel');
    });

    test('preserves an explicitly supplied successUrl', async () => {
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        mockCheckoutFetch();

        await ghostApi.member.checkoutPlan({
            plan: 'price_123',
            tierId: 'tier_123',
            cadence: 'month',
            successUrl: 'https://example.com/custom-welcome/',
            cancelUrl: 'https://example.com/custom-cancel/'
        });

        const body = lastCheckoutBody();
        expect(body.successUrl).toBe('https://example.com/custom-welcome/');
        expect(body.cancelUrl).toBe('https://example.com/custom-cancel/');
    });
});
