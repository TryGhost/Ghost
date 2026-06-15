import {afterEach, describe, expect, it, vi} from 'vitest';

import {
    buildTransistorUrl,
    canContinueGiftSubscription,
    checkTransistorMembership,
    isValidMemberUuid,
    resolveTransistorDisplay
} from './account-home';
import type {SiteState, Translator} from '../../types';
import type {Subscription} from '../../shared/api-client';

const markingT: Translator = key => `t:${key}`;

function makeSite(overrides: Partial<SiteState> = {}): SiteState {
    return {title: 'Blog', url: 'https://example.com/', locale: 'en', ...overrides};
}

describe('isValidMemberUuid', () => {
    it('accepts UUIDs in any case', () => {
        expect(isValidMemberUuid('0f7a513c-13f6-4e92-a2c5-9a8f24f9e3a1')).toBe(true);
        expect(isValidMemberUuid('0F7A513C-13F6-4E92-A2C5-9A8F24F9E3A1')).toBe(true);
    });

    it('rejects missing or malformed values', () => {
        expect(isValidMemberUuid(undefined)).toBe(false);
        expect(isValidMemberUuid('')).toBe(false);
        expect(isValidMemberUuid('not-a-uuid')).toBe(false);
        expect(isValidMemberUuid('0f7a513c13f64e92a2c59a8f24f9e3a1')).toBe(false);
    });
});

describe('resolveTransistorDisplay', () => {
    it('translates defaults when settings are unset', () => {
        const display = resolveTransistorDisplay(makeSite(), markingT);

        expect(display).toEqual({
            heading: 't:Podcasts',
            description: 't:Access your RSS feeds',
            buttonText: 't:Manage',
            urlTemplate: 'https://partner.transistor.fm/ghost/{memberUuid}'
        });
    });

    it('translates values equal to the defaults', () => {
        const display = resolveTransistorDisplay(makeSite({
            transistor_portal_heading: 'Podcasts',
            transistor_portal_description: 'Access your RSS feeds',
            transistor_portal_button_text: 'Manage'
        }), markingT);

        expect(display.heading).toBe('t:Podcasts');
        expect(display.description).toBe('t:Access your RSS feeds');
        expect(display.buttonText).toBe('t:Manage');
    });

    it('passes custom admin strings through untranslated', () => {
        const display = resolveTransistorDisplay(makeSite({
            transistor_portal_heading: 'Mein Podcast',
            transistor_portal_button_text: 'Anhören',
            transistor_portal_url_template: 'https://example.com/feed/{memberUuid}'
        }), markingT);

        expect(display.heading).toBe('Mein Podcast');
        expect(display.buttonText).toBe('Anhören');
        expect(display.urlTemplate).toBe('https://example.com/feed/{memberUuid}');
    });
});

describe('buildTransistorUrl', () => {
    it('replaces the memberUuid placeholder', () => {
        expect(buildTransistorUrl('https://partner.transistor.fm/ghost/{memberUuid}', 'u-1')).toBe('https://partner.transistor.fm/ghost/u-1');
    });
});

describe('canContinueGiftSubscription', () => {
    const subscription = {
        id: 's1',
        tier: {id: 'tier-1', name: 'Gold', expiry_at: '2026-12-01T00:00:00.000Z'}
    } as Subscription;
    const eligible = {
        memberStatus: 'gift' as const,
        subscription,
        siteTiers: [{id: 'tier-1', name: 'Gold'}],
        paidMembersEnabled: true
    };

    it('allows gift members on an active tier with paid members enabled', () => {
        expect(canContinueGiftSubscription(eligible)).toBe(true);
    });

    it('rejects when any gate fails', () => {
        expect(canContinueGiftSubscription({...eligible, memberStatus: 'paid'})).toBe(false);
        expect(canContinueGiftSubscription({...eligible, paidMembersEnabled: false})).toBe(false);
        expect(canContinueGiftSubscription({...eligible, paidMembersEnabled: undefined})).toBe(false);
        expect(canContinueGiftSubscription({...eligible, subscription: undefined})).toBe(false);
        expect(canContinueGiftSubscription({...eligible, siteTiers: [{id: 'other', name: 'Silver'}]})).toBe(false);
        expect(canContinueGiftSubscription({...eligible, siteTiers: undefined})).toBe(false);
        expect(canContinueGiftSubscription({
            ...eligible,
            subscription: {...subscription, tier: {id: 'tier-1', name: 'Gold'}} as Subscription
        })).toBe(false);
    });
});

describe('checkTransistorMembership', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function stubFetch(response: {ok: boolean; body?: unknown}): ReturnType<typeof vi.fn> {
        const fetchMock = vi.fn(async () => ({
            ok: response.ok,
            json: async () => response.body
        }));
        vi.stubGlobal('fetch', fetchMock);
        return fetchMock;
    }

    it('returns true when Transistor reports membership', async () => {
        const fetchMock = stubFetch({ok: true, body: {member: true}});

        await expect(checkTransistorMembership('u-1', new AbortController().signal)).resolves.toBe(true);
        expect(fetchMock).toHaveBeenCalledWith('https://partner.transistor.fm/ghost/member/u-1', expect.objectContaining({signal: expect.any(AbortSignal)}));
    });

    it('returns false for non-members and failed requests', async () => {
        stubFetch({ok: true, body: {member: false}});
        await expect(checkTransistorMembership('u-1', new AbortController().signal)).resolves.toBe(false);

        stubFetch({ok: false});
        await expect(checkTransistorMembership('u-1', new AbortController().signal)).resolves.toBe(false);
    });
});
