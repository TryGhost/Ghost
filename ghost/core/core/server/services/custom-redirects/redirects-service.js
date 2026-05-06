const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const DynamicRedirectManager = require('../lib/dynamic-redirect-manager');

const messages = {
    redirectsRegister: 'Could not register custom redirects.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects',
    skippedInvalidRedirect: 'Skipped invalid redirect: {context}',
    rejectedRedirect: 'Could not register redirect: {from} -> {to}',
    allRedirectsSkipped: 'None of the {total} redirect(s) in the store could be activated. Check the logged errors above.'
};

const defaultCreateDryRunManager = () => new DynamicRedirectManager({
    permanentMaxAge: 0,
    getSubdirectoryURL: pathname => pathname
});

/**
 * Thin orchestrator on top of a RedirectsStore and the in-memory
 * DynamicRedirectManager. Keeps storage and request-time activation as
 * separate, independently callable operations so that:
 *
 *  - boot can call `init()` (read-from-store + activate, errors logged)
 *  - the API endpoint can call `replace()` (validate + persist + activate)
 *  - a future cross-instance notifier can call `activate()` to rebuild
 *    in-memory state without re-persisting
 */
class RedirectsService {
    /**
     * @param {object} deps
     * @param {import('./types').RedirectsStore} deps.store
     * @param {object} deps.redirectManager - Mutable DynamicRedirectManager. Reused across activations because consumers (site.js) hold a reference to its `handleRequest`.
     * @param {(redirects: import('./types').RedirectConfig[]) => void} deps.validate - Throws on invalid redirects.
     * @param {() => object} [deps.createDryRunManager] - Factory for a throwaway manager used by `replace()` to verify every entry loads before persisting. Defaults to a fresh DynamicRedirectManager. Tests can stub.
     */
    constructor({store, redirectManager, validate, createDryRunManager = defaultCreateDryRunManager}) {
        /** @private */
        this.store = store;
        /** @private */
        this.redirectManager = redirectManager;
        /** @private */
        this.validate = validate;
        /** @private */
        this.createDryRunManager = createDryRunManager;
    }

    /**
     * Reads the current redirects from the store and rebuilds the
     * in-memory router.
     *
     * Per-item handling: a single bad redirect (failed validation,
     * regex compile error, or any other addRedirect rejection) is
     * logged and skipped — the remaining redirects still activate.
     * This is a deliberate shift from the legacy CustomRedirectsAPI,
     * which validated the whole batch up-front and silently loaded
     * zero redirects on the first bad rule. Logged at error level so
     * the failure surfaces to operators rather than disappearing into
     * warn-level noise.
     *
     * Store-level failures (network, parse) bubble up so the caller
     * can decide how to handle them — `init()` logs and ignores; a
     * future cross-instance notifier may want to retry.
     *
     * Reading happens before the manager is cleared (the actual clear
     * lives inside `_loadIntoManager`): if the store throws, the
     * previously-active redirects are left in place rather than being
     * wiped to an empty state.
     */
    async activate() {
        const redirects = await this.store.getAll();
        this._loadIntoManager(redirects);
    }

    /**
     * Validates the entire batch up-front, persists it, then loads it
     * into the in-memory router directly. Used by the upload path: a
     * single bad redirect from a publisher upload should reject the
     * whole batch rather than silently dropping a rule.
     *
     * Pre-flight: every entry is loaded into a throwaway manager
     * before we persist, so a regex that survives `validate()` but
     * fails the manager's stricter buildRegex (e.g. case-insensitive
     * patterns whose flag-strip leaves an invalid regex body) rejects
     * the whole upload. Without this, `store.replaceAll()` could
     * succeed and `_loadIntoManager()`'s skip-and-log would leave
     * disk and memory in sync but partially activated.
     *
     * Skips the round-trip through `store.getAll()` that `activate()`
     * does at boot — we already hold the validated array, and a
     * post-write read failure (transient FS) would otherwise return a
     * 500 to the publisher even though disk + memory could be
     * resynchronised on the next boot.
     *
     * @param {import('./types').RedirectConfig[]} redirects
     */
    async replace(redirects) {
        this.validate(redirects);
        this._verifyAllLoadable(redirects);
        await this.store.replaceAll(redirects);
        this._loadIntoManager(redirects);
    }

    /**
     * @private
     * @param {import('./types').RedirectConfig[]} redirects
     */
    _verifyAllLoadable(redirects) {
        const dryRun = this.createDryRunManager();
        for (const redirect of redirects) {
            // DynamicRedirectManager.addRedirect signals rejection two
            // ways: it returns `null` for an invalid built regex, but
            // it can also throw on other unexpected failures. Unify
            // both into a single ValidationError so `replace()` returns
            // a 4xx rather than a raw 500 for either failure mode.
            let id;
            try {
                id = dryRun.addRedirect(redirect.from, redirect.to, {
                    permanent: redirect.permanent
                });
            } catch (err) {
                throw new errors.ValidationError({
                    message: tpl(messages.rejectedRedirect, {
                        from: redirect.from,
                        to: redirect.to
                    }),
                    context: redirect,
                    help: tpl(messages.redirectsHelp),
                    err
                });
            }
            if (id === null) {
                throw new errors.ValidationError({
                    message: tpl(messages.rejectedRedirect, {
                        from: redirect.from,
                        to: redirect.to
                    }),
                    context: redirect,
                    help: tpl(messages.redirectsHelp)
                });
            }
        }
    }

    /**
     * @private
     * @param {import('./types').RedirectConfig[]} redirects
     */
    _loadIntoManager(redirects) {
        this.redirectManager.removeAllRedirects();

        let loaded = 0;
        for (const redirect of redirects) {
            try {
                this.validate([redirect]);
                const id = this.redirectManager.addRedirect(redirect.from, redirect.to, {
                    permanent: redirect.permanent
                });
                // DynamicRedirectManager swallows regex-compile errors
                // and returns null. Without an explicit check, a bad
                // entry surviving validate() would silently disappear
                // from the live router with no operator-visible signal
                // — the activate() boot path doesn't get the up-front
                // dry-run that replace() runs.
                if (id === null) {
                    throw new errors.ValidationError({
                        message: tpl(messages.rejectedRedirect, {
                            from: redirect.from,
                            to: redirect.to
                        }),
                        context: redirect
                    });
                }
                loaded++;
            } catch (err) {
                logging.error(new errors.IncorrectUsageError({
                    message: tpl(messages.skippedInvalidRedirect, {context: err.message}),
                    err
                }));
            }
        }

        if (redirects.length > 0 && loaded === 0) {
            logging.error(new errors.IncorrectUsageError({
                message: tpl(messages.allRedirectsSkipped, {total: redirects.length}),
                help: tpl(messages.redirectsHelp)
            }));
        }
    }

    /** @returns {Promise<import('./types').RedirectConfig[]>} */
    async getAll() {
        return this.store.getAll();
    }

    /**
     * Boot-time entrypoint. Wraps `activate` so a misconfigured or
     * unreadable store does not crash Ghost. The error is logged and
     * the manager is left in whatever state activate left it in
     * (typically empty if the store call failed before the
     * removeAllRedirects step, otherwise empty after a successful
     * clear).
     */
    async init() {
        try {
            await this.activate();
        } catch (err) {
            if (errors.utils.isGhostError(err)) {
                logging.error(err);
            } else {
                logging.error(new errors.IncorrectUsageError({
                    message: tpl(messages.redirectsRegister),
                    context: err.message,
                    help: tpl(messages.redirectsHelp),
                    err
                }));
            }
        }
    }
}

module.exports = RedirectsService;
