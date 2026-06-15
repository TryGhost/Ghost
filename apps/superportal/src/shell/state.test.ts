import {describe, it, expect, vi} from 'vitest';
import {StateStore, readBootConfig, memberFromApiRecord} from './state';
import type {PortalState} from '../types';

function fakeDoc(dataset: Record<string, string> | null): Document {
    return {querySelector: () => (dataset ? {dataset} : null)} as unknown as Document;
}

function initial(): PortalState {
    return {
        site: {title: 'Blog', url: 'https://example.com/', locale: 'en', portal_signup_terms_html: null},
        member: null,
        features: ['members'],
        theme: {}
    };
}

describe('StateStore.mergeSiteData', () => {
    it('validates and merges tiers and newsletters', () => {
        const store = new StateStore(initial());

        store.mergeSiteData({
            tiers: [{id: 't1', name: 'Gold', monthly_price: 500}, {bad: true}],
            newsletters: [{id: 'n1', name: 'Weekly', status: 'active', paid: false}, null as unknown as object]
        });

        const site = store.get().site;
        expect(site.tiers?.map(t => t.id)).toEqual(['t1']);
        expect(site.tiers?.[0]?.monthly_price).toBe(500);
        expect(site.newsletters?.map(n => n.id)).toEqual(['n1']);
    });

    it('leaves arrays untouched when not provided', () => {
        const store = new StateStore(initial());

        store.mergeSiteData({tiers: [{id: 't1', name: 'Gold'}]});

        expect(store.get().site.newsletters).toBeUndefined();
    });

    it('notifies subscribers', () => {
        const store = new StateStore(initial());
        const listener = vi.fn();
        store.subscribe(listener);

        store.mergeSiteData({tiers: []});

        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('readBootConfig', () => {
    it('builds initial state from script tag attributes', () => {
        const state = readBootConfig(fakeDoc({
            ghost: 'https://example.com/',
            adminUrl: 'https://admin.example.com/',
            key: 'k1',
            locale: 'fr',
            features: 'members,share,bogus'
        }));

        expect(state.site.url).toBe('https://example.com/');
        expect(state.site.admin_url).toBe('https://admin.example.com/');
        expect(state.site.search_api_key).toBe('k1');
        expect(state.site.locale).toBe('fr');
        expect(state.features).toEqual(['members', 'share']);
        expect(state.member).toBeNull();
    });

    it('throws without the shell tag or data-ghost', () => {
        expect(() => readBootConfig(fakeDoc(null))).toThrow();
        expect(() => readBootConfig(fakeDoc({locale: 'en'}))).toThrow();
    });
});

describe('StateStore.mergeSettings', () => {
    it('maps and validates the settings payload', () => {
        const store = new StateStore(initial());

        store.mergeSettings({
            title: 'New Title',
            accent_color: '#0c8a51',
            portal_name: true,
            portal_plans: ['free', 'monthly', 7],
            members_signup_access: 'paid',
            donations_enabled: true
        });

        const site = store.get().site;
        expect(site.title).toBe('New Title');
        expect(site.accent_color).toBe('#0c8a51');
        expect(site.portal_plans).toEqual(['free', 'monthly']);
        expect(site.members_signup_access).toBe('paid');
        expect(site.donations_enabled).toBe(true);
        expect(site.url).toBe('https://example.com/');
    });

    it('keeps boot values when settings omit them', () => {
        const store = new StateStore(initial());

        store.mergeSettings({});

        expect(store.get().site.title).toBe('Blog');
        expect(store.get().site.locale).toBe('en');
    });

    it('maps transistor settings and rejects wrong types', () => {
        const store = new StateStore(initial());

        store.mergeSettings({
            transistor_portal_enabled: true,
            transistor_portal_heading: 'My Podcast',
            transistor_portal_description: 'Feeds',
            transistor_portal_button_text: 'Listen',
            transistor_portal_url_template: 'https://example.com/{memberUuid}'
        });

        const site = store.get().site;
        expect(site.transistor_portal_enabled).toBe(true);
        expect(site.transistor_portal_heading).toBe('My Podcast');
        expect(site.transistor_portal_description).toBe('Feeds');
        expect(site.transistor_portal_button_text).toBe('Listen');
        expect(site.transistor_portal_url_template).toBe('https://example.com/{memberUuid}');

        store.mergeSettings({transistor_portal_enabled: 'yes', transistor_portal_heading: 42});
        expect(store.get().site.transistor_portal_enabled).toBeUndefined();
        expect(store.get().site.transistor_portal_heading).toBeUndefined();
    });

    it('maps comments_enabled and rejects unknown values', () => {
        const store = new StateStore(initial());

        store.mergeSettings({comments_enabled: 'paid'});
        expect(store.get().site.comments_enabled).toBe('paid');

        store.mergeSettings({comments_enabled: 'sometimes'});
        expect(store.get().site.comments_enabled).toBeUndefined();
    });
});

describe('StateStore.mergePreviewSite', () => {
    it('wins over settings and survives later site-data merges', () => {
        const store = new StateStore(initial());
        store.mergeSettings({portal_name: true, accent_color: '#000000'});

        store.mergePreviewSite({portal_name: false, accent_color: '#FF1A75', portal_products: ['t1']});
        store.mergeSiteData({tiers: [{id: 't1', name: 'Gold'}]});

        const site = store.get().site;
        expect(site.portal_name).toBe(false);
        expect(site.accent_color).toBe('#FF1A75');
        expect(site.portal_products).toEqual(['t1']);
        expect(site.tiers?.map(t => t.id)).toEqual(['t1']);
    });

    it('notifies subscribers', () => {
        const store = new StateStore(initial());
        const listener = vi.fn();
        store.subscribe(listener);

        store.mergePreviewSite({portal_name: true});

        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('StateStore.mergeMembersSite', () => {
    it('merges sentry config and ghost version', () => {
        const store = new StateStore(initial());

        store.mergeMembersSite({sentry_dsn: 'https://x@sentry.io/1', sentry_env: 'production', version: '6.0'});

        const site = store.get().site;
        expect(site.sentry_dsn).toBe('https://x@sentry.io/1');
        expect(site.sentry_env).toBe('production');
        expect(site.version).toBe('6.0');
    });

    it('ignores garbage input and non-string fields', () => {
        const store = new StateStore(initial());

        store.mergeMembersSite(null);
        store.mergeMembersSite({sentry_dsn: 42, version: {}});

        const site = store.get().site;
        expect(site.sentry_dsn).toBeUndefined();
        expect(site.version).toBeUndefined();
    });

    it('does not clobber settings-derived fields', () => {
        const store = new StateStore(initial());
        store.mergeSettings({title: 'New Title', accent_color: '#0c8a51'});

        store.mergeMembersSite({version: '6.0'});

        expect(store.get().site.title).toBe('New Title');
        expect(store.get().site.accent_color).toBe('#0c8a51');
        expect(store.get().site.version).toBe('6.0');
    });
});

describe('memberFromApiRecord', () => {
    it('maps a members-api record without id using uuid', () => {
        const m = memberFromApiRecord({uuid: 'u1', email: 'a@b.c', name: 'A', status: 'paid'});

        expect(m).toEqual({id: 'u1', uuid: 'u1', email: 'a@b.c', name: 'A', status: 'paid', referral_code: undefined});
    });

    it('returns null for invalid input', () => {
        expect(memberFromApiRecord(null)).toBeNull();
        expect(memberFromApiRecord({name: 'No Email'})).toBeNull();
    });
});
