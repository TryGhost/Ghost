import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import * as errors from '@tryghost/errors';

import DynamicRedirectManager from '../lib/dynamic-redirect-manager';
import type {RedirectConfig, RedirectsStore} from './types';

const messages = {
    redirectsRegister: 'Could not register custom redirects.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects',
    skippedInvalidRedirect: 'Skipped invalid redirect: {context}',
    rejectedRedirect: 'Could not register redirect: {from} -> {to}',
    allRedirectsSkipped: 'None of the {total} redirect(s) in the store could be activated. Check the logged errors above.'
};

export interface RedirectManagerLike {
    removeAllRedirects(): void;
    addRedirect(from: string, to: string, options: {permanent?: boolean}): string | null;
}

export type ValidateFn = (redirects: RedirectConfig[]) => void;

interface RedirectsServiceDeps {
    store: RedirectsStore;
    /** Mutated across activations — never replaced — because `site.js` holds a reference to its `handleRequest`. */
    redirectManager: RedirectManagerLike;
    validate: ValidateFn;
    /** Override for tests; defaults to a fresh DynamicRedirectManager. */
    createDryRunManager?: () => RedirectManagerLike;
}

const defaultCreateDryRunManager = (): RedirectManagerLike => new DynamicRedirectManager({
    permanentMaxAge: 0,
    getSubdirectoryURL: (pathname: string) => pathname
});

/**
 * Splits storage from activation so the in-memory router can be
 * rebuilt without writing a file. The future cross-instance notifier
 * (out of scope here) needs `activate()` standalone.
 */
export class RedirectsService {
    private readonly store: RedirectsStore;
    private readonly redirectManager: RedirectManagerLike;
    private readonly validate: ValidateFn;
    private readonly createDryRunManager: () => RedirectManagerLike;

    constructor({store, redirectManager, validate, createDryRunManager = defaultCreateDryRunManager}: RedirectsServiceDeps) {
        this.store = store;
        this.redirectManager = redirectManager;
        this.validate = validate;
        this.createDryRunManager = createDryRunManager;
    }

    /**
     * Read-then-clear ordering: if the store throws, the previously
     * active redirects are left in place rather than wiped to empty.
     */
    async activate(): Promise<void> {
        const redirects = await this.store.getAll();
        this._loadIntoManager(redirects, {validatePerItem: true, failFast: false});
    }

    /**
     * Pre-flights every entry into a throwaway manager so a regex
     * that survives `validate()` but fails the manager's stricter
     * buildRegex rejects the whole upload. Without this,
     * `store.replaceAll()` could succeed and the per-item skip path
     * would leave disk and memory partially synchronised.
     */
    async replace(redirects: RedirectConfig[]): Promise<void> {
        this.validate(redirects);
        this._verifyAllLoadable(redirects);
        await this.store.replaceAll(redirects);
        this._loadIntoManager(redirects, {validatePerItem: false, failFast: true});
    }

    private _verifyAllLoadable(redirects: RedirectConfig[]): void {
        const dryRun = this.createDryRunManager();
        for (const redirect of redirects) {
            // addRedirect signals rejection two ways — `null` for an
            // invalid built regex, or a thrown error otherwise. Unify
            // into ValidationError so replace() returns 4xx not 500.
            let id: string | null;
            try {
                id = dryRun.addRedirect(redirect.from, redirect.to, {
                    permanent: redirect.permanent
                });
            } catch (err) {
                throw this._buildRejectedError(redirect, err);
            }
            if (id === null) {
                throw this._buildRejectedError(redirect);
            }
        }
    }

    /**
     * - `validatePerItem`: boot calls `validate()` per entry because
     *   nothing else has; upload has already batch-validated.
     * - `failFast`: upload re-throws on any failure because the
     *   dry-run was supposed to make this branch unreachable.
     *   Reaching it means an invariant broke (e.g. dry-run and live
     *   manager construction drifted apart) and silent partial
     *   activation is worse than a 5xx. Boot keeps skip-and-log so a
     *   single bad redirect on disk doesn't take the whole config out.
     */
    private _loadIntoManager(redirects: RedirectConfig[], {validatePerItem, failFast}: {validatePerItem: boolean; failFast: boolean}): void {
        this.redirectManager.removeAllRedirects();

        let loaded = 0;
        for (const redirect of redirects) {
            try {
                if (validatePerItem) {
                    this.validate([redirect]);
                }
                const id = this.redirectManager.addRedirect(redirect.from, redirect.to, {
                    permanent: redirect.permanent
                });
                if (id === null) {
                    throw this._buildRejectedError(redirect);
                }
                loaded += 1;
            } catch (err) {
                if (failFast) {
                    throw err;
                }
                logging.error(new errors.IncorrectUsageError({
                    message: tpl(messages.skippedInvalidRedirect, {context: (err as Error).message}),
                    err
                }));
            }
        }

        if (!failFast && redirects.length > 0 && loaded === 0) {
            logging.error(new errors.IncorrectUsageError({
                message: tpl(messages.allRedirectsSkipped, {total: redirects.length}),
                help: tpl(messages.redirectsHelp)
            }));
        }
    }

    private _buildRejectedError(redirect: RedirectConfig, cause?: unknown): Error {
        return new errors.ValidationError({
            message: tpl(messages.rejectedRedirect, {
                from: redirect.from,
                to: redirect.to
            }),
            context: redirect,
            help: tpl(messages.redirectsHelp),
            ...(cause !== undefined ? {err: cause} : {})
        });
    }

    async getAll(): Promise<RedirectConfig[]> {
        return this.store.getAll();
    }

    /**
     * Boot wrapper. Swallows errors so a misconfigured / unreadable
     * store doesn't crash Ghost.
     */
    async init(): Promise<void> {
        try {
            await this.activate();
        } catch (err) {
            if (errors.utils.isGhostError(err)) {
                logging.error(err);
            } else {
                logging.error(new errors.IncorrectUsageError({
                    message: tpl(messages.redirectsRegister),
                    context: (err as Error).message,
                    help: tpl(messages.redirectsHelp),
                    err
                }));
            }
        }
    }
}
