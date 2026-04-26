const debug = require('@tryghost/debug')('services:url:lazy:service');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const urlUtils = require('../../../../shared/url-utils');
const events = require('../../../lib/common/events');
const Resources = require('../resources');
const resourcesConfig = require('../config');
const LazyUrlGenerator = require('./lazy-url-generator');

const DEFAULT_TOLERANCE_MS = 100;

/**
 * Drop-in replacement for the eager UrlService.
 *
 * Reuses the existing Resources class to load + maintain the in-memory cache
 * of publishable rows (so RESOURCE_CONFIG visibility filters and model-event
 * subscriptions are inherited unchanged). Replaces the Queue + Urls + per-
 * generator ownership machinery with a single ownership map maintained
 * directly by this class.
 *
 * Boot timing:
 *   1. init() fetches resources (narrow SELECT × 4 tables, identical to eager)
 *   2. RouterManager registers generators via onRouterAddedType()
 *   3. After a tolerance window (matches the eager queue's tolerance), one
 *      pass over (generator × resource) populates the ownership map and
 *      fires url.added events for the sitemap.
 *
 * Runtime:
 *   - Model events flow through Resources to a queue stub here, which
 *     recomputes ownership for the affected resource and fires the
 *     appropriate url.added / url.removed transitions.
 *   - Reads (getUrlByResourceId / getResource / owns / etc.) are O(1) lookups
 *     against the ownership map.
 */
class LazyUrlService {
    constructor({cache, resourcesFactory, toleranceMs = DEFAULT_TOLERANCE_MS} = {}) {
        this.utils = urlUtils;
        this.cache = cache; // intentionally unused — lazy service does not persist URLs
        this.urlGenerators = [];
        this.finished = false;
        this.lastInitStartTime = null;
        this.toleranceMs = toleranceMs;

        this._activeUrls = new Map();
        // Per-type slug → resource index, rebuilt during _recomputeAllUrls and
        // patched on _onResourceChanged / _onResourceRemoved. Keeps the
        // forward-lookup (getResource) at O(1) instead of O(n) over
        // resources.getAllByType, which would dominate any benchmark on a
        // large database.
        this._slugIndex = new Map();
        this._recomputeScheduled = false;
        this._recomputeTimer = null;
        this._modelEventListeners = [];
        this._removeListenersBound = false;

        this.queue = this._createQueueStub();
        this.resources = resourcesFactory
            ? resourcesFactory({queue: this.queue})
            : new Resources({resourcesConfig, queue: this.queue});
    }

    /**
     * Stub for the eager Queue. Resources calls `start({event, eventData})`
     * when a resource is added or its routing-relevant fields change. We
     * translate that into an ownership recompute for the single affected
     * resource and fire the corresponding url events.
     *
     * INVARIANT: this design relies on Resource.isReserved() always being
     * false in the lazy service, so that `Resources._onResourceUpdated`
     * always reaches its `queue.start(...)` call. No code path inside the
     * lazy service should call `resource.reserve()`. If that invariant is
     * ever broken — e.g., by a future refactor that shares Resource
     * instances with code that does reserve them — model updates will
     * silently stop propagating to the lazy URL service. Either keep this
     * invariant, or stop reusing Resources and copy the cache logic here.
     */
    _createQueueStub() {
        return {
            start: ({event, eventData}) => {
                if (event === 'added' && eventData) {
                    this._onResourceChanged(eventData.type, eventData.id);
                }
            },
            reset: () => {},
            softReset: () => {},
            addListener: () => {},
            removeListener: () => {}
        };
    }

    /**
     * Fetch all publishable resources and start listening for model events.
     * Mirrors UrlService.init() minus the queue init event — boot completion
     * is gated on routers registering, not on the queue draining.
     */
    async init() {
        this.lastInitStartTime = Date.now();
        this.resources.initEventListeners();
        await this.resources.fetchResources();
        this._subscribeToRemoveEvents();
    }

    /**
     * Resources's _onResourceRemoved does not fire a queue event (it just
     * drops the cached entry), so we subscribe to the same model events
     * directly to learn about removals and emit url.removed accordingly.
     *
     * Idempotent: a second call (e.g. init→softReset→init) is a no-op so
     * remove events do not double-fire.
     */
    _subscribeToRemoveEvents() {
        if (this._removeListenersBound) {
            return;
        }
        for (const rconfig of resourcesConfig) {
            const removeEvents = Array.isArray(rconfig.events.remove)
                ? rconfig.events.remove
                : [rconfig.events.remove];

            for (const eventName of removeEvents) {
                const listener = (model) => {
                    const id = model.id || model._previousAttributes?.id;
                    if (id) {
                        this._onResourceRemoved(id);
                    }
                };
                events.on(eventName, listener);
                this._modelEventListeners.push({eventName, listener});
            }
        }
        this._removeListenersBound = true;
    }

    onRouterAddedType(identifier, filter, resourceType, permalink) {
        debug('Registering route:', filter, resourceType, permalink);

        const generator = new LazyUrlGenerator({
            identifier,
            filter,
            resourceType,
            permalink,
            position: this.urlGenerators.length
        });
        this.urlGenerators.push(generator);
        this._scheduleRecompute();
    }

    // eslint-disable-next-line no-unused-vars
    onRouterUpdated(identifier) {
        // No per-generator ownership to regenerate; a full recompute is sufficient.
        // The identifier argument is preserved for API compatibility with the eager service.
        this._scheduleRecompute();
    }

    /**
     * Debounce multiple router registrations (or a series of
     * onRouterUpdated calls) into a single recompute pass once the
     * tolerance window has elapsed since the LAST trigger. Mirrors the
     * eager queue's tolerance behavior, including the reset-on-new-
     * subscriber semantic so registration spread across >tolerance ms
     * still results in a single recompute with the full generator list.
     */
    _scheduleRecompute() {
        if (this._recomputeTimer) {
            clearTimeout(this._recomputeTimer);
        }
        this._recomputeScheduled = true;
        this._recomputeTimer = setTimeout(() => {
            this._recomputeScheduled = false;
            this._recomputeTimer = null;
            this._recomputeAllUrls();

            if (!this.finished) {
                this.finished = true;
                const elapsed = Date.now() - this.lastInitStartTime;
                logging.info(`URL Service ready in ${elapsed}ms (lazy)`);
                metrics.metric('url-service', elapsed);
            }
        }, this.toleranceMs);
    }

    /**
     * One-pass ownership recomputation. Walks each resource type in
     * registration order, picks the first matching generator, computes the
     * URL, and diffs against the previous ownership map to emit transition
     * events for the sitemap. Also rebuilds the per-type slug index so
     * forward lookups (getResource) stay O(1).
     */
    _recomputeAllUrls() {
        const newActive = new Map();
        const newSlugIndex = new Map();

        const generatorsByType = new Map();
        for (const gen of this.urlGenerators) {
            if (!generatorsByType.has(gen.resourceType)) {
                generatorsByType.set(gen.resourceType, []);
            }
            generatorsByType.get(gen.resourceType).push(gen);
        }

        // Build the slug index for ALL resource types we know about, even
        // those without a registered generator — getResource still needs
        // to be able to look them up if a generator is added later.
        for (const type of Object.keys(this.resources.data || {})) {
            const typeIndex = new Map();
            for (const resource of this.resources.getAllByType(type) || []) {
                if (resource.data.slug) {
                    typeIndex.set(resource.data.slug, resource);
                }
            }
            newSlugIndex.set(type, typeIndex);
        }

        for (const [type, gens] of generatorsByType) {
            const resources = this.resources.getAllByType(type) || [];
            for (const resource of resources) {
                const owner = this._findOwner(resource, gens);
                if (owner) {
                    const url = owner.generateUrl(resource.data);
                    newActive.set(resource.data.id, {
                        url,
                        generatorId: owner.uid,
                        resource
                    });
                }
            }
        }

        this._diffAndEmit(this._activeUrls, newActive);
        this._activeUrls = newActive;
        this._slugIndex = newSlugIndex;
    }

    _patchSlugIndex(type, resource) {
        let typeIndex = this._slugIndex.get(type);
        if (!typeIndex) {
            typeIndex = new Map();
            this._slugIndex.set(type, typeIndex);
        }
        if (resource.data.slug) {
            typeIndex.set(resource.data.slug, resource);
        }
    }

    _findOwner(resource, candidateGenerators) {
        for (const gen of candidateGenerators) {
            if (gen.matches(resource.data)) {
                return gen;
            }
        }
        return null;
    }

    /**
     * Recompute ownership for a single resource (model-event path).
     */
    _onResourceChanged(type, id) {
        const resource = this.resources.getByIdAndType(type, id);
        if (!resource) {
            // Resource dropped from cache (e.g. failed RESOURCE_CONFIG filter
            // post-update). Treat as removal.
            this._onResourceRemoved(id);
            return;
        }

        this._patchSlugIndex(type, resource);

        const candidates = this.urlGenerators.filter(g => g.resourceType === type);
        const owner = this._findOwner(resource, candidates);
        const current = this._activeUrls.get(id);

        if (!owner) {
            if (current) {
                this._emitRemoved(current);
                this._activeUrls.delete(id);
            }
            return;
        }

        const url = owner.generateUrl(resource.data);
        const next = {url, generatorId: owner.uid, resource};

        if (!current) {
            this._activeUrls.set(id, next);
            this._emitAdded(next);
        } else if (current.url !== url || current.generatorId !== owner.uid) {
            this._emitRemoved(current);
            this._activeUrls.set(id, next);
            this._emitAdded(next);
        }
    }

    _onResourceRemoved(id) {
        const current = this._activeUrls.get(id);
        if (current) {
            // Drop the slug index entry too — the resource is gone from
            // Resources.data already by the time this listener fires.
            const typeIndex = this._slugIndex.get(current.resource.config.type);
            if (typeIndex && current.resource.data.slug) {
                typeIndex.delete(current.resource.data.slug);
            }
            this._emitRemoved(current);
            this._activeUrls.delete(id);
        }
    }

    _diffAndEmit(prev, next) {
        for (const [id, prevEntry] of prev) {
            const nextEntry = next.get(id);
            if (!nextEntry || nextEntry.url !== prevEntry.url) {
                this._emitRemoved(prevEntry);
            }
        }
        for (const [id, nextEntry] of next) {
            const prevEntry = prev.get(id);
            if (!prevEntry || prevEntry.url !== nextEntry.url) {
                this._emitAdded(nextEntry);
            }
        }
    }

    _emitAdded(entry) {
        events.emit('url.added', {
            url: {
                relative: entry.url,
                absolute: urlUtils.createUrl(entry.url, true)
            },
            resource: entry.resource
        });
    }

    _emitRemoved(entry) {
        // Match the eager Urls.removeResourceId emit shape (url is a string here).
        events.emit('url.removed', {
            url: entry.url,
            resource: entry.resource
        });
    }

    // ---- Public read API ----

    hasFinished() {
        return this.finished;
    }

    getUrlByResourceId(id, options = {}) {
        const entry = this._activeUrls.get(id);
        const relative = entry ? entry.url : '/404/';

        if (options.absolute) {
            return this.utils.createUrl(relative, options.absolute);
        }
        if (options.withSubdirectory) {
            return this.utils.createUrl(relative, false, true);
        }
        return relative;
    }

    getResource(url, options = {}) {
        if (!this.finished) {
            throw new errors.InternalServerError({
                message: 'UrlService is processing.',
                code: 'URLSERVICE_NOT_READY'
            });
        }

        // Walk in priority (registration) order; first owner-matching generator wins.
        for (const gen of this.urlGenerators) {
            const match = gen.matchUrl(url);
            if (!match) {
                continue;
            }

            const resource = this._lookupResourceForMatch(gen, match);
            if (!resource) {
                continue;
            }

            // Confirm the generator still owns this resource right now —
            // mirrors the eager getResource semantic where ownership is
            // reflected by the existence of a Urls entry.
            const owned = this._activeUrls.get(resource.data.id);
            if (!owned || owned.generatorId !== gen.uid || owned.url !== url) {
                continue;
            }

            if (options.returnEverything) {
                return {url: owned.url, generatorId: owned.generatorId, resource};
            }
            return resource;
        }

        return null;
    }

    _lookupResourceForMatch(gen, match) {
        const lookupField = gen.compiledPermalink.lookupField;
        const lookupValue = match[lookupField];

        if (lookupField === 'slug') {
            const typeIndex = this._slugIndex.get(gen.resourceType);
            return typeIndex ? typeIndex.get(lookupValue) || null : null;
        }

        if (lookupField === 'id') {
            // Forward-lookup by id is rare (only for permalinks like /p/:id/);
            // the id-keyed _activeUrls answers it directly when ownership exists.
            const entry = this._activeUrls.get(lookupValue);
            return entry && entry.resource.config.type === gen.resourceType
                ? entry.resource
                : null;
        }

        return null;
    }

    getResourceById(resourceId) {
        const entry = this._activeUrls.get(resourceId);
        if (!entry) {
            throw new errors.NotFoundError({
                message: 'Resource not found.',
                code: 'URLSERVICE_RESOURCE_NOT_FOUND'
            });
        }
        return entry.resource;
    }

    owns(routerId, id) {
        const generator = this.urlGenerators.find(g => g.identifier === routerId);
        if (!generator) {
            return false;
        }
        const entry = this._activeUrls.get(id);
        return !!entry && entry.generatorId === generator.uid;
    }

    getPermalinkByUrl(url, options = {}) {
        const everything = this.getResource(url, {returnEverything: true});
        if (!everything) {
            return null;
        }
        const gen = this.urlGenerators.find(g => g.uid === everything.generatorId);
        if (!gen) {
            return null;
        }
        if (options.withUrlOptions) {
            return urlUtils.urlJoin(gen.permalink, '/:options(edit)?/');
        }
        return gen.permalink;
    }

    // ---- Lifecycle ----

    async shutdown() {
        // No persistence in the lazy implementation.
    }

    reset(options = {}) {
        if (this._recomputeTimer) {
            clearTimeout(this._recomputeTimer);
            this._recomputeTimer = null;
            this._recomputeScheduled = false;
        }
        this.urlGenerators = [];
        this._activeUrls = new Map();
        this._slugIndex = new Map();
        this.finished = false;
        this.resources.reset();

        if (!options.keepListeners) {
            for (const {eventName, listener} of this._modelEventListeners) {
                events.removeListener(eventName, listener);
            }
            this._modelEventListeners = [];
            this._removeListenersBound = false;
        }
    }

    resetGenerators(options = {}) {
        if (this._recomputeTimer) {
            clearTimeout(this._recomputeTimer);
            this._recomputeTimer = null;
            this._recomputeScheduled = false;
        }
        this.finished = false;
        this.urlGenerators = [];

        // Emit url.removed for everything so the sitemap clears its state,
        // mirroring the eager urls.reset() effect (the eager path does not
        // emit removals on reset, but the sitemap also has its own
        // routers.reset listener that wipes its state — see
        // site-map-manager.js:46-51 — so we don't need to over-emit here).

        for (const entry of this._activeUrls.values()) {
            this._emitRemoved(entry);
        }
        this._activeUrls = new Map();

        if (options.releaseResourcesOnly) {
            this.resources.releaseAll();
        } else {
            this.resources.softReset();
        }
    }

    softReset() {
        if (this._recomputeTimer) {
            clearTimeout(this._recomputeTimer);
            this._recomputeTimer = null;
            this._recomputeScheduled = false;
        }
        this.finished = false;
        this._activeUrls = new Map();
        this.resources.softReset();
    }
}

module.exports = LazyUrlService;
