import * as Sentry from '@sentry/ember';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class TagRoute extends AuthenticatedRoute {
    @service feature;
    @service modals;
    @service router;
    @service session;
    @service('unsaved-changes') unsavedChanges;

    // ensures if a tag model is passed in directly we show it immediately
    // and refresh in the background
    _requiresBackgroundRefresh = true;
    _unregisterUnsavedChanges = null;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('index');
        }

        // React owns this URL when the flag is on. Keep the Ember route from
        // loading and rendering a second tag editor behind the React screen.
        if (this.feature.tagDetailsReact !== true) {
            return;
        }

        transition.abort();

        const reactRouteUrl = this._reactRouteUrl(transition);

        // Ember and React share window.location.hash, and an aborted
        // transition never reaches updateURL. A URL intent (cold load, hash
        // change, React-driven navigation) already has the browser URL
        // pointing here, so React renders and there is nothing to do. A named
        // intent (the Cmd-K search modal's tag results) has no URL yet -
        // without writing one the click is a silent no-op.
        if (!transition.intent?.url) {
            this._navigateToReactRoute(reactRouteUrl);
        }

        this._parkOnReactFallback(reactRouteUrl);
    }

    // Built by hand rather than with `router.urlFor`, whose output depends on
    // the configured location. `transition.to.params` is only populated for a
    // transition passing string params - one passing a tag model serializes
    // too late to read here, so fall back to the list rather than a bad URL.
    _reactRouteUrl(transition) {
        const {name, params} = transition.to ?? {};

        if (name === 'tag.new') {
            return '/tags/new';
        }
        if (name === 'tag' && typeof params?.tag_slug === 'string') {
            return `/tags/${encodeURIComponent(params.tag_slug)}`;
        }

        return '/tags';
    }

    // Aborting stops Ember rendering this screen, but it also leaves the
    // router believing it is still on the route we came from. That desync is
    // only invisible until you navigate back to the very same URL: Ember
    // compares it against the route it thinks it is on, finds no difference,
    // and runs no transition at all. Park on `react-fallback` - the empty
    // catch-all Ember already uses for URLs React owns - to keep the router's
    // state honest. The fallback must use the real tag path: parking on
    // `tag` briefly sends React to an unknown URL, and restoring the hash
    // with replaceState does not notify React Router. That leaves the browser
    // showing React's 404 until the next reload.
    // See PostsRoute#_parkOnReactFallback for the full rationale (replace
    // semantics, the parked-path guard, and URL restoration).
    _parkOnReactFallback(reactRouteUrl) {
        const fallbackPath = reactRouteUrl.replace(/^\//, '');
        const parkedPath = this.router.currentRouteName === 'react-fallback'
            ? this.router.currentRoute?.params?.path
            : null;

        if (parkedPath === fallbackPath) {
            return;
        }

        const url = window.location.hash;
        const state = window.history.state;

        this.router.replaceWith('react-fallback', fallbackPath)
            .finally(() => this._restoreUrl(url, state));
    }

    // Parking writes the fallback route's own path, so the captured URL goes
    // back afterwards. `replaceState`: no history entry, and no `hashchange`
    // to re-enter routing. The captured history state goes back with it -
    // react-router keeps `{usr, key, idx}` there, and parking would otherwise
    // drop it on the URL-intent path where React created the entry.
    _restoreUrl(url, state) {
        window.history.replaceState(state, '', url);
    }

    // Seam so tests can assert the navigation without a real hash location -
    // Ember acceptance tests run with `location: 'none'`.
    _navigateToReactRoute(url) {
        window.location.hash = url;
    }

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.tag_slug) {
            return this.store.queryRecord('tag', {slug: params.tag_slug, include: 'count.posts'});
        } else {
            return this.store.createRecord('tag');
        }
    }

    serialize(tag) {
        return {tag_slug: tag.get('slug')};
    }

    setupController(controller, tag) {
        super.setupController(...arguments);

        if (this._requiresBackgroundRefresh) {
            tag.reload();
        }

        this._registerUnsavedChanges(controller);
    }

    deactivate() {
        this._requiresBackgroundRefresh = true;
        this._unregisterUnsavedChanges?.();
        this._unregisterUnsavedChanges = null;
    }

    @action
    async willTransition(transition) {
        return this.unsavedChanges.guardTransition(transition);
    }

    _registerUnsavedChanges(controller) {
        this._unregisterUnsavedChanges?.();
        this._unregisterUnsavedChanges = this.unsavedChanges.register({
            isDirty: () => controller.model?.hasDirtyAttributes,
            confirmLeave: () => this._confirmUnsavedChanges(controller)
        });
    }

    async _confirmUnsavedChanges(controller) {
        if (controller.saveTask?.isRunning) {
            try {
                await controller.saveTask.last;
            } catch (e) {
                // ignore save errors — we'll check dirty state below
            }
        }

        if (!controller.model?.hasDirtyAttributes) {
            return true;
        }

        Sentry.captureMessage('showing unsaved changes modal for tags route');
        const shouldLeave = await this.modals.open(ConfirmUnsavedChangesModal);

        if (shouldLeave) {
            controller.model.rollbackAttributes();
            return true;
        }

        return false;
    }
}
