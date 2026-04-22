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
