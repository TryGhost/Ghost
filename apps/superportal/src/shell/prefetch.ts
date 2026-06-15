import type {FeatureName, FeatureMount, MountContext} from '../types';
import {warn} from '../shared/log';

/**
 * Eager-prefetch orchestrator.
 *
 * For each enabled feature, kicks off the dynamic `import()` after first paint
 * so the chunk is parsed and cached by the time the user interacts with a
 * trigger. The chunk's `mount` is NOT called yet — fetch is decoupled from
 * execute. Trigger handlers later resolve the same import (synchronous from
 * cache) and call `mount`.
 *
 * Why a registry: dynamic imports take string literals so Rollup can analyse
 * them at build time. Mapping FeatureName -> () => import('...feature') keeps
 * the strings static while letting the orchestrator iterate over enabled flags.
 */
type ChunkLoader = () => Promise<{mount: FeatureMount}>;

const REGISTRY: Record<FeatureName, ChunkLoader> = {
    members: () => import('../features/members') as Promise<{mount: FeatureMount}>,
    share: () => import('../features/share'),
    gift: () => import('../features/gift') as Promise<{mount: FeatureMount}>,
    announcement: () => import('../features/announcement') as Promise<{mount: FeatureMount}>,
    search: () => import('../features/search') as Promise<{mount: FeatureMount}>,
    offers: () => import('../features/offers') as Promise<{mount: FeatureMount}>,
    donations: () => import('../features/donations') as Promise<{mount: FeatureMount}>,
    feedback: () => import('../features/feedback') as Promise<{mount: FeatureMount}>,
    unsubscribe: () => import('../features/unsubscribe') as Promise<{mount: FeatureMount}>,
    recommendations: () => import('../features/recommendations') as Promise<{mount: FeatureMount}>
};

/**
 * Cache of in-flight or resolved chunk modules. Repeated `loadFeature` calls
 * return the same promise — by the time a click handler fires, the prefetch
 * has typically already filled this in.
 */
const inflight = new Map<FeatureName, Promise<{mount: FeatureMount}>>();

export function loadFeature(name: FeatureName): Promise<{mount: FeatureMount}> {
    let p = inflight.get(name);
    if (!p) {
        const loader = REGISTRY[name];
        if (!loader) {
            return Promise.reject(new Error(`unknown feature: ${name}`));
        }
        p = loader().catch((err) => {
            // On failure, drop from cache so a subsequent attempt can retry.
            inflight.delete(name);
            throw err;
        });
        inflight.set(name, p);
    }
    return p;
}

/**
 * Schedule prefetches for every enabled feature, after first paint.
 * Idle callback if available, microtask fallback otherwise.
 */
export function prefetchEnabled(features: FeatureName[]): void {
    const run = (): void => {
        for (const name of features) {
            loadFeature(name).catch((err) => {
                warn(`prefetch failed for ${name}: ${(err as Error).message}`);
            });
        }
    };

    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, {timeout: 1500});
    } else {
        setTimeout(run, 0);
    }
}

/**
 * Resolve and mount a feature in response to a trigger. If prefetch already
 * ran, this is synchronous from the module cache; otherwise it loads on demand.
 *
 * Silently no-ops with a warn() if the feature isn't enabled in `state.features` —
 * matches today's behaviour when a theme has `data-portal="signup"` on a site
 * without members.
 */
export async function triggerFeature(name: FeatureName, ctx: MountContext, enabled: FeatureName[]): Promise<void> {
    if (!enabled.includes(name)) {
        warn(`trigger fired for disabled feature "${name}" — no-op`);
        return;
    }
    try {
        const mod = await loadFeature(name);
        await mod.mount(ctx);
    } catch (err) {
        warn(`mount failed for ${name}: ${(err as Error).message}`);
    }
}
