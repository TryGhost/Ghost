import {afterEach, describe, expect, it, vi} from 'vitest';

import {createPreviewApiClient} from './preview';

const SITE = {url: 'https://example.com', search_api_key: 'k1'};

describe('createPreviewApiClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the fixture member with a fresh period end', async () => {
        const api = createPreviewApiClient(SITE);

        const record = await api.member.sessionData();

        expect(record?.id).toBe('preview-member');
        expect(record?.email).toBe('jamie@example.com');
        expect(record?.status).toBe('paid');
        const sub = record?.subscriptions[0];
        expect(sub?.default_payment_card_last4).toBe('4242');
        expect(sub?.price).toMatchObject({amount: 1500, currency: 'USD', interval: 'year'});
        expect(Date.now() - new Date(sub?.current_period_end ?? 0).getTime()).toBeLessThan(60_000);
    });

    it('resolves member mutations without touching the network', async () => {
        const fetchMock = vi.fn(() => Promise.reject(new Error('network')));
        vi.stubGlobal('fetch', fetchMock);
        const api = createPreviewApiClient(SITE);

        await api.member.sendMagicLink({email: 'x@y.z', emailType: 'signup'});
        await api.member.checkoutPlan({tierId: 't1', cadence: 'year'});
        await api.member.manageBilling({});
        await api.member.signout();
        await api.member.deleteSuppression();
        await api.member.continueGiftCheckout();
        const res = await api.member.updateSubscription({subscriptionId: 's1', cancel_at_period_end: false});

        expect(res.ok).toBe(true);
        expect(await api.member.identity()).toBeNull();
        expect(await api.member.offers()).toEqual({offers: []});
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
