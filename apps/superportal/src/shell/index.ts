/**
 * Superportal shell — entry for `portal.min.js`.
 *
 * Lifecycle:
 *  1. Read boot config from the script tag's data attributes.
 *  2. Resolve dependency rules (e.g., gift -> members).
 *  3. Block on locale + site settings + member fetches (Portal's boot model).
 *  4. Wire DOM listeners.
 *  5. Schedule eager-prefetch of feature chunks.
 *  6. Mount eager-on-mount features (announcement, signup-form binding).
 *  7. Expose `window.PortalApi` for theme/3p extensibility.
 */

import {readBootConfig, memberFromApiRecord, StateStore} from './state';
import {createApiClientFromSite, type MembersApiClient} from '../shared/api-client';
import {getGiftRedemptionSuccessMessage} from '../shared/gift';
import {ModalService} from './modal-service';
import {NotificationService} from './notification-service';
import {clearNotificationParams, parseNotificationFromUrl} from './notification-parser';
import {createServices} from './services';
import {bindListeners} from './listeners';
import {loadFeature, prefetchEnabled, triggerFeature} from './prefetch';
import {I18nStore, loadLocale} from '../shared/i18n';
import {isPreviewMode, parsePreviewParams} from './preview';
import {getPreviewMember} from '../shared/api-client/preview-fixtures';
import {setupFirstPromoter} from '../shared/first-promoter';
import {setupSentry} from '../shared/sentry';
import {warn, info} from '../shared/log';
import type {FeatureName, MountContext} from '../types';

/**
 * Read the URL the bundle is served from so we can locate co-hosted assets
 * (locales, etc.) regardless of CDN path. We fall back to "" for tests.
 */
function detectAssetBase(): string {
    const tag = document.currentScript as HTMLScriptElement | null;
    if (tag?.src) {
        const url = new URL(tag.src);
        return url.href.replace(/[^/]+$/, '').replace(/\/$/, '');
    }
    // ESM `type="module"` scripts don't populate document.currentScript reliably.
    // Look up the marker tag instead.
    const marker = document.querySelector<HTMLScriptElement>('script[data-superportal-shell]');
    if (marker?.src) {
        const url = new URL(marker.src);
        return url.href.replace(/[^/]+$/, '').replace(/\/$/, '');
    }
    return '';
}

function applyDependencyRules(features: FeatureName[]): FeatureName[] {
    const set = new Set(features);
    if (set.has('gift') && !set.has('members')) {
        warn('gift enabled without members — disabling gift');
        set.delete('gift');
    }
    if (set.has('offers') && !set.has('members')) {
        warn('offers enabled without members — disabling offers');
        set.delete('offers');
    }
    if (set.has('donations') && !set.has('members')) {
        warn('donations enabled without members — disabling donations');
        set.delete('donations');
    }
    return Array.from(set);
}

/**
 * After a modal closes, drop any portal-related hash fragment from the URL so
 * a subsequent click on `<a href="#/share">` or `<a href="#/portal/signup">`
 * triggers a fresh `hashchange` event. Without this, the second click is a
 * no-op because the URL is already at the same hash.
 *
 * Mirrors apps/portal/src/utils/helpers.js#removePortalLinkFromUrl —
 * `pushState` (not `location.hash = ''`) so no navigation event fires.
 */
function clearPortalHashIfPresent(): void {
    const hash = window.location.hash;
    if (!hash) return;
    const path = hash.startsWith('#/') ? hash.slice(2) : '';
    const isPortalHash =
        path === 'share' ||
        path.startsWith('share/') ||
        path === 'portal' ||
        path.startsWith('portal/');
    if (isPortalHash) {
        window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
}

async function loadSettings(state: StateStore, api: MembersApiClient): Promise<void> {
    try {
        const res = await api.site.settings();
        if (res?.settings) {
            state.mergeSettings(res.settings);
        }
    } catch (err) {
        warn('failed to load site settings', err);
    }
}

async function loadSite(state: StateStore, api: MembersApiClient): Promise<void> {
    try {
        const res = await api.site.read();
        if (res?.site) {
            state.mergeMembersSite(res.site);
        }
    } catch (err) {
        warn('failed to load site data', err);
    }
}

async function loadMember(state: StateStore, api: MembersApiClient): Promise<void> {
    try {
        const record = await api.member.sessionData();
        if (record) {
            state.setMember(memberFromApiRecord(record));
        }
    } catch (err) {
        warn('failed to load member', err);
    }
}

async function main(): Promise<void> {
    const stateInput = readBootConfig();
    stateInput.features = applyDependencyRules(stateInput.features);
    if (isPreviewMode()) {
        stateInput.preview = true;
    }
    const state = new StateStore(stateInput);

    const i18n = new I18nStore();
    const modal = new ModalService({
        getState: () => state.get(),
        getDir: () => i18n.dir(),
        // In preview the hash IS the state (admin updates it on every settings
        // change) — clearing it would break re-parsing and admin's src diffing.
        onModalClosed: () => {
            if (!state.get().preview) clearPortalHashIfPresent();
        }
    });
    const notification = new NotificationService({
        getState: () => state.get(),
        t: i18n.t,
        getDir: () => i18n.dir()
    });
    const services = createServices({state, modal, notification, i18n});

    // The bootstrap entry installs the resolver; in dev and tests it is absent
    // and the detected base is used as-is. Must not import asset-base directly —
    // that would share a module with the bootstrap and emit a static chunk
    // import in portal.min.js, reintroducing the CDN version-skew race.
    const detected = detectAssetBase();
    const baseUrl = window.__superportalAssetUrl?.(detected) ?? detected;
    const api = createApiClientFromSite(state.get().site);

    // C-block: features mount only after locale, settings, and member resolve.
    const [{locale, strings}] = await Promise.all([
        loadLocale(baseUrl, state.get().site.locale),
        loadSettings(state, api),
        loadSite(state, api),
        state.get().preview ? Promise.resolve() : loadMember(state, api)
    ]);
    i18n.setLocale(locale, strings);

    setupFirstPromoter(state.get());
    void setupSentry(state.get(), {assetBase: baseUrl});

    // Ghost Admin portal-settings preview: the members modal is the whole UI.
    // Admin re-points the iframe src on every settings change, which lands as
    // a hashchange (same-document navigation) — re-parse and re-mount each
    // time. Everything below the early return is deliberately skipped:
    // notifications/listeners/query triggers can't apply, eager mounts would
    // hit real APIs behind the backdrop, and PortalApi would let theme JS open
    // non-preview modals inside the preview iframe.
    if (state.get().preview) {
        const applyPreview = (): void => {
            const {site: overrides, page} = parsePreviewParams(window.location.hash);
            state.mergePreviewSite(overrides);
            state.setMember(page === 'accountHome' ? getPreviewMember() : null);
            void loadFeature('members')
                .then(mod => mod.mount({services, params: {action: page === 'accountHome' ? 'account' : 'signup'}}))
                .catch(err => warn(`preview mount failed: ${(err as Error).message}`));
        };
        window.addEventListener('hashchange', applyPreview);
        applyPreview();
        info('shell ready — preview mode');
        return;
    }

    // Gift checkout return: core appends these to the Stripe successUrl.
    // Handled before the notification block so the params don't get cleared.
    const boot = new URLSearchParams(window.location.search);
    if (boot.get('stripe') === 'gift-purchase-success') {
        const giftSuccess = {
            view: 'success',
            token: boot.get('gift_token') ?? '',
            tierId: boot.get('gift_tier') ?? '',
            cadence: boot.get('gift_cadence') ?? ''
        };
        clearNotificationParams(['stripe', 'gift_token', 'gift_tier', 'gift_cadence']);
        void triggerFeature('gift', {services, params: giftSuccess}, state.get().features);
    }

    // After a successful signup, recommendations (when enabled) take over the
    // post-signup moment — Portal shows the recommendations popup instead of a
    // success toast in this case.
    const recsPostSignup = Boolean(state.get().site.recommendations_enabled)
        && boot.get('action') === 'signup'
        && boot.get('success') === 'true'
        && state.get().features.includes('recommendations');

    const parsed = parseNotificationFromUrl();
    if (parsed && !recsPostSignup) {
        const snapshot = state.get();
        const fullName = snapshot.member?.name;
        const firstname = fullName ? fullName.split(' ')[0] : undefined;
        let message: string | undefined;
        if (parsed.type === 'giftRedeem' && parsed.status === 'success') {
            const record = await api.member.sessionData().catch(() => null);
            message = getGiftRedemptionSuccessMessage(record, i18n.t, snapshot.site.locale) ?? undefined;
        }
        services.showNotification({
            ...parsed,
            message,
            firstname,
            siteTitle: snapshot.site.title,
            siteUrl: snapshot.site.url,
            hasMember: Boolean(snapshot.member)
        });
        clearNotificationParams();
    }

    bindListeners({services, enabled: state.get().features});

    if (recsPostSignup) {
        void triggerFeature('recommendations', {services, params: {fromSignup: 'true'}}, state.get().features);
        clearNotificationParams();
    }

    // Query-param trigger: `?offer=CODE` opens the offer landing on load
    // (mirrors today's gift `?gift=` entry). Hash/`data-portal` offer triggers
    // are handled by the listeners above.
    const offerCode = new URLSearchParams(window.location.search).get('offer');
    if (offerCode) {
        void triggerFeature('offers', {services, params: {offerCode}}, state.get().features);
    }

    // Unsubscribe email-link: `?action=unsubscribe&uuid=&key=&newsletter=&comments=`.
    // Unauthenticated (keyed by uuid+key); only valid with both present.
    const search = new URLSearchParams(window.location.search);
    if (search.get('action') === 'unsubscribe' && search.get('uuid') && search.get('key')) {
        void triggerFeature('unsubscribe', {
            services,
            params: {
                uuid: search.get('uuid') ?? '',
                key: search.get('key') ?? '',
                newsletter: search.get('newsletter') ?? '',
                comments: search.get('comments') ?? ''
            }
        }, state.get().features);
    }

    // Gift redemption link: `?gift=TOKEN` (hash form `#/portal/gift/redeem/{token}`
    // is handled by the listeners above).
    const giftToken = search.get('gift');
    if (giftToken) {
        void triggerFeature('gift', {services, params: {giftToken}}, state.get().features);
    }

    prefetchEnabled(state.get().features);

    // Eager-on-mount: features that have visible DOM presence and should appear
    // immediately rather than waiting for a click.
    await mountEagerVisible(services, state.get().features);

    // Expose the public extension surface. Backwards-compatible name; a future
    // pass can audit the full v2 API and re-implement specific methods on top
    // of `services`.
    type PortalApi = {
        services: typeof services;
        openPopup: (opts: {page: string; tier?: string; cadence?: string}) => void;
    };
    (window as unknown as {PortalApi: PortalApi}).PortalApi = {
        services,
        openPopup: ({page, tier, cadence}) => {
            const params: Record<string, string> = {action: page};
            if (tier) params.tier = tier;
            if (cadence) params.cadence = cadence;
            const ctx: MountContext = {services, params};
            const feature: FeatureName = page === 'share' ? 'share' : page === 'gift' ? 'gift' : 'members';
            void triggerFeature(feature, ctx, state.get().features);
        }
    };

    info(`shell ready — features: ${state.get().features.join(', ') || 'none'}, locale: ${locale}`);
}

async function mountEagerVisible(services: ReturnType<typeof createServices>, features: FeatureName[]): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    if (features.includes('announcement') && document.body) {
        tasks.push(
            loadFeature('announcement')
                .then((mod) => mod.mount({services}))
                .catch((err) => warn(`announcement mount failed: ${(err as Error).message}`))
        );
    }

    if (features.includes('members')) {
        // The members chunk also owns inline `data-members-form` form bindings.
        // Eager-on-mount it whenever a relevant form exists on the page.
        const hasMemberForms = document.querySelector('[data-members-form], [data-members-plan], [data-members-edit-billing]');
        if (hasMemberForms) {
            tasks.push(
                loadFeature('members')
                    .then((mod) => mod.mount({services, params: {action: 'bind-forms'}}))
                    .catch((err) => warn(`members form-bind failed: ${(err as Error).message}`))
            );
        }
    }

    await Promise.all(tasks);
}

main().catch((err) => warn(`shell init failed: ${(err as Error).message}`));
