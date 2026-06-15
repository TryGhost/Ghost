import type {FeatureName, MountContext, Services} from '../types';
import {triggerFeature} from './prefetch';

/**
 * DOM-contract listeners. The shell wires these up once on init; they live for
 * the page lifetime. Each listener resolves a click into a (feature, params)
 * pair and dispatches via triggerFeature, which loads the chunk and mounts it.
 *
 * Theme contract preserved unchanged from today:
 *  - [data-portal="signin|signup|account|signup/{tier-slug}/{cadence}"] -> members
 *  - [data-portal="share"]   -> share
 *  - [data-portal="gift"]    -> gift
 *  - [data-portal="offer/{code}"] -> offers
 *  - [data-portal="support"]      -> donations
 *  - [data-ghost-search]     -> search (separate convention preserved)
 *  - Cmd/Ctrl+K              -> search
 *  - #/portal/...            -> members (hash-routed)
 *  - #/share                 -> share (hash-routed)
 */

interface BindOptions {
    services: Services;
    enabled: FeatureName[];
}

export function bindListeners({services, enabled}: BindOptions): void {
    // Click delegation. One listener on document handles every [data-portal] /
    // [data-ghost-search] click; we don't bind per-element. That means listeners
    // continue working when themes inject more triggers later (e.g., via JS).
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const portalEl = target.closest<HTMLElement>('[data-portal]');
        if (portalEl) {
            const action = portalEl.dataset.portal ?? '';
            const dispatch = parsePortalAction(action);
            if (dispatch) {
                event.preventDefault();
                const ctx: MountContext = {
                    services,
                    triggerElement: portalEl,
                    params: dispatch.params
                };
                void triggerFeature(dispatch.feature, ctx, enabled);
                return;
            }
        }

        const searchEl = target.closest<HTMLElement>('[data-ghost-search]');
        if (searchEl) {
            event.preventDefault();
            void triggerFeature('search', {services, triggerElement: searchEl}, enabled);
        }
    });

    // Cmd/Ctrl+K opens search — universal expectation among power readers.
    document.addEventListener('keydown', (event) => {
        const isMetaOrCtrl = event.metaKey || event.ctrlKey;
        if (isMetaOrCtrl && (event.key === 'k' || event.key === 'K')) {
            event.preventDefault();
            void triggerFeature('search', {services}, enabled);
        }
    });

    // Hash-route handling. Today's themes link to `#/portal/signup` etc.; we honour
    // those on initial load and on subsequent hashchange.
    const handleHash = (): void => {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#/')) return;
        const path = hash.slice(2); // drop '#/'
        if (path.startsWith('portal/') || path === 'portal') {
            const sub = path.slice('portal/'.length);
            const dispatch = parsePortalAction(sub || 'signup');
            if (dispatch) {
                void triggerFeature(dispatch.feature, {services, params: dispatch.params}, enabled);
            }
            return;
        }
        if (path === 'share' || path.startsWith('share/')) {
            void triggerFeature('share', {services}, enabled);
            return;
        }
        // Post feedback email-link: `#/feedback/{postId}/{score}/?uuid=&key=`.
        if (path.startsWith('feedback/')) {
            const [pathPart = '', queryPart] = path.split('?');
            const segs = pathPart.split('/').filter(Boolean); // ['feedback', postId, score]
            const postId = segs[1];
            const score = segs[2];
            if (!postId || (score !== '0' && score !== '1')) return;
            const q = new URLSearchParams(queryPart ?? '');
            const uuid = q.get('uuid') ?? '';
            const key = q.get('key') ?? '';
            if (uuid && key) {
                void triggerFeature('feedback', {services, params: {postId, score, uuid, key}}, enabled);
            } else if (services.getState().member) {
                void triggerFeature('feedback', {services, params: {postId, score}}, enabled);
            } else {
                // Mirror Portal: feedback without a key requires sign-in.
                void triggerFeature('members', {services, params: {action: 'signin'}}, enabled);
            }
        }
    };
    window.addEventListener('hashchange', handleHash);
    // Defer the initial-hash dispatch a tick so any synchronous shell setup
    // settles first.
    setTimeout(handleHash, 0);
}

/**
 * Parse a `data-portal` value into a (feature, params) pair.
 * Returns null when the value isn't one we route — matches today's behaviour
 * (silent no-op rather than throwing).
 */
export function parsePortalAction(action: string): {feature: FeatureName; params: Record<string, string>} | null {
    if (!action) return null;
    const [head, ...rest] = action.split('/');

    switch (head) {
    case 'account':
        // Email-FAQ deep links: `account/newsletters/help` + `account/newsletters/disabled`.
        if (rest[0] === 'newsletters' && rest[1] === 'help') {
            return {feature: 'members', params: {action: 'email-receiving-faq'}};
        }
        if (rest[0] === 'newsletters' && rest[1] === 'disabled') {
            return {feature: 'members', params: {action: 'email-suppression-faq'}};
        }
        return {feature: 'members', params: {action: 'account'}};
    case 'signin':
    case 'signup':
        return {
            feature: 'members',
            params: rest.length ? parseSignupTierAndCadence(head, rest) : {action: head}
        };
    case 'share':
        return {feature: 'share', params: {}};
    case 'gift':
        // `gift/redeem/{token}` — core's /gift/{token} page redirects here.
        if (rest[0] === 'redeem' && rest[1]) {
            return {feature: 'gift', params: {giftToken: decodeURIComponent(rest[1])}};
        }
        return {feature: 'gift', params: {}};
    case 'offer':
    case 'offers':
        // `offer/{code}` (and the hash `#/portal/offers/{code}`).
        return {feature: 'offers', params: rest[0] ? {code: rest[0]} : {}};
    case 'support':
        // `support` (donate), `support/success`, `support/error`.
        return {feature: 'donations', params: {action: rest[0] ?? 'donate'}};
    case 'recommendations':
        // `#/portal/recommendations` — standalone list.
        return {feature: 'recommendations', params: {}};
    default:
        return null;
    }
}

function parseSignupTierAndCadence(action: string, rest: string[]): Record<string, string> {
    // `signup/{tier-slug}/{cadence}` — both optional.
    const params: Record<string, string> = {action};
    if (rest[0]) params.tier = rest[0];
    if (rest[1]) params.cadence = rest[1];
    return params;
}
