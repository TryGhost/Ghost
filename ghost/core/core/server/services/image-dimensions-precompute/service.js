const logging = require('@tryghost/logging');

// Settings keys whose values are image URLs that {{ghost_head}} resolves dimensions for.
const SETTING_KEYS = ['logo', 'icon', 'cover_image', 'og_image', 'twitter_image'];

/**
 * Proactively warms the image-dimensions cache (the `cache:imageSizes` adapter) whenever
 * an image URL is assigned/changed on a post, user, or setting.
 *
 * `{{ghost_head}}` builds SEO meta on every render and, on a cache miss, synchronously
 * probes external image hosts to read their dimensions (see core/frontend/meta/image-dimensions.js).
 * By warming the cache at edit time we move that probe off the render hot path: the render
 * reads an already-populated entry instead of opening a fresh connection per request. With the
 * `cache:imageSizes` adapter pointed at Redis, the warm entry is shared across all processes
 * of an instance, so it is probed once per unique URL rather than once per process.
 *
 * Warming is best-effort: it runs in a fire-and-forget job and can never break a save.
 */
class ImageDimensionsPrecomputeService {
    /**
     * @param {object} deps
     * @param {(url: string) => Promise<any>} deps.getCachedImageSizeFromUrl - probes + caches dimensions for a URL
     * @param {{addJob: (name: string, fn: () => Promise<any>) => Promise<any>}} deps.jobService - inline (in-process) job queue
     */
    constructor({getCachedImageSizeFromUrl, jobService}) {
        this.getCachedImageSizeFromUrl = getCachedImageSizeFromUrl;
        this.jobService = jobService;
    }

    /**
     * @param {{on: (event: string, listener: Function) => void}} events
     */
    listen(events) {
        events.on('post.added', this.handlePostChange.bind(this));
        events.on('post.edited', this.handlePostChange.bind(this));
        events.on('page.added', this.handlePostChange.bind(this));
        events.on('page.edited', this.handlePostChange.bind(this));

        events.on('user.added', this.handleUserChange.bind(this));
        // `user.edited` fires unconditionally on every user update (including the
        // `activated.edited` case), so we don't subscribe to `user.activated.edited`
        // as well — that would just enqueue the same warm job twice.
        events.on('user.edited', this.handleUserChange.bind(this));

        for (const key of SETTING_KEYS) {
            events.on(`settings.${key}.edited`, this.handleSettingChange.bind(this));
        }
    }

    /**
     * Don't warm during imports or internal/fixture writes — those touch large numbers of
     * records at once and would flood the queue with probe jobs.
     * @private
     */
    shouldSkip(options) {
        return !!(options && (options.importing || (options.context && options.context.internal)));
    }

    handlePostChange(model, options) {
        if (this.shouldSkip(options)) {
            return;
        }
        // og_image/twitter_image live on the posts_meta relation; feature_image on the post.
        const postsMeta = typeof model.related === 'function' ? model.related('posts_meta') : null;
        return this.warm([
            ...this.changedImageUrls(model, ['feature_image']),
            ...(postsMeta ? this.changedImageUrls(postsMeta, ['og_image', 'twitter_image']) : [])
        ]);
    }

    handleUserChange(model, options) {
        if (this.shouldSkip(options)) {
            return;
        }
        return this.warm(this.changedImageUrls(model, ['profile_image', 'cover_image']));
    }

    handleSettingChange(model, options) {
        if (this.shouldSkip(options)) {
            return;
        }
        // The setting's image URL lives in its `value` column.
        return this.warm(this.changedImageUrls(model, ['value']));
    }

    /**
     * Returns the current values of `fields` that actually changed in this save.
     *
     * This is important: model saves fire for unrelated reasons (e.g. a user's
     * `last_seen` is updated on every request), and we must not probe an image
     * URL that didn't change — otherwise every request would enqueue a probe.
     *
     * @param {object} model
     * @param {string[]} fields
     * @returns {string[]}
     */
    changedImageUrls(model, fields) {
        const urls = [];
        for (const field of fields) {
            const value = model.get(field);
            if (!value) {
                continue;
            }
            if (!this.didFieldChange(model, field)) {
                continue;
            }
            urls.push(value);
        }
        return urls;
    }

    /**
     * Whether `field` changed in the save that triggered this event.
     *
     * We can't use bookshelf's `model.hasChanged(field)` here: bookshelf resets
     * `model.changed` (what `hasChanged()` reads) *before* it fires the `*.added`/
     * `*.edited` events, so by the time this listener runs `hasChanged()` reports
     * nothing as changed. Ghost snapshots the change set onto `model._changed` (and
     * copies it onto the `posts_meta` relation in the post model) precisely so it
     * survives the event — so we consult that snapshot instead.
     *
     * When no snapshot is available (non-bookshelf/test models) we treat the field
     * as changed so the value is still warmed.
     *
     * @param {object} model
     * @param {string} field
     * @returns {boolean}
     * @private
     */
    didFieldChange(model, field) {
        if (model && typeof model._changed === 'object' && model._changed !== null) {
            return Object.prototype.hasOwnProperty.call(model._changed, field);
        }
        return true;
    }

    /**
     * Enqueue a best-effort job that populates the dimensions cache for each unique, non-empty URL.
     * Returns the job promise so callers/tests can await completion (production listeners ignore it).
     * @param {Array<string|null|undefined|false>} urls
     */
    warm(urls) {
        const unique = [...new Set((urls || []).filter(Boolean))];
        if (!unique.length) {
            return;
        }

        try {
            return this.jobService.addJob('precompute-image-dimensions', async () => {
                for (const url of unique) {
                    try {
                        // getCachedImageSizeFromUrl probes once + caches, short-circuits on a hit,
                        // and already swallows + logs transient errors (returning null).
                        await this.getCachedImageSizeFromUrl(url);
                    } catch (err) {
                        logging.error(err);
                    }
                }
            });
        } catch (err) {
            // Best-effort: failing to enqueue the job must never break the save that triggered it.
            logging.error(err);
        }
    }
}

module.exports = ImageDimensionsPrecomputeService;
module.exports.SETTING_KEYS = SETTING_KEYS;
