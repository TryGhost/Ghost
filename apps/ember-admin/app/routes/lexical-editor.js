import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

/**
 * Builds a query string from transition query params, excluding empty values.
 * @param {Record<string, unknown>} [queryParams={}] - Query params from route info.
 * @returns {string} Query string including the leading `?`, or an empty string.
 */
function buildQueryString(queryParams = {}) {
    let searchParams = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => {
                searchParams.append(key, `${item}`);
            });
            return;
        }

        searchParams.append(key, `${value}`);
    });

    let queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
}

/**
 * Creates a canonical analytics path to return to from the lexical editor.
 * @param {object|undefined} transition - Transition that opened the editor.
 * @param {{id?: string|number}|undefined} model - Current post model fallback.
 * @returns {string|false} Analytics path when available, otherwise `false`.
 */
function buildAnalyticsSourcePath(transition, model) {
    let fromPath = transition?.from?.params?.path;
    let queryString = buildQueryString(transition?.from?.queryParams);

    let postMatch = fromPath?.match(/^posts\/analytics\/([^/]+)(?:\/(.+))?$/);
    if (postMatch) {
        let postId = postMatch[1] || model?.id;
        if (!postId) {
            return false;
        }
        let sub = postMatch[2];
        let basePath = sub ? `/posts/analytics/${postId}/${sub}` : `/posts/analytics/${postId}`;
        return `${basePath}${queryString}`;
    }

    let statsMatch = fromPath?.match(/^analytics(?:\/(.+))?$/);
    if (statsMatch) {
        let sub = statsMatch[1];
        let basePath = sub ? `/analytics/${sub}` : '/analytics';
        return `${basePath}${queryString}`;
    }

    return false;
}

export default AuthenticatedRoute.extend({
    feature: service(),
    notifications: service(),
    router: service(),
    ui: service(),

    classNames: ['editor'],

    // React owns /editor/* when the flag is on. Aborting keeps the Ember
    // editor subtree unrendered and skips `activate()`, so full-screen state
    // is never set for a screen nobody sees.
    beforeModel(transition) {
        this._super(...arguments);

        // Strictly boolean: a non-boolean labs value must not hand the route
        // to React.
        if (this.feature.editorReact !== true) {
            return;
        }

        transition.abort();

        // Ember and React share window.location.hash, and an aborted
        // transition never reaches updateURL. A URL intent (cold load, hash
        // change, React-driven navigation) already has the browser URL
        // pointing here, so React renders and there is nothing to do. A
        // named intent (post list title links, Cmd-K search results, the
        // post-success modal's revert-to-draft) has no URL yet — without
        // writing one the click is a silent no-op.
        if (!transition.intent?.url) {
            this._navigateToReactRoute(this._reactRouteUrl(transition));
        }

        this._parkOnReactFallback();
    },

    activate() {
        this._super(...arguments);
        this.ui.set('isFullScreen', true);
    },

    setupController(controller, model, transition) {
        if (transition.to?.name === 'lexical-editor.new') {
            return;
        }

        controller.fromAnalytics = buildAnalyticsSourcePath(transition, model) || false;
    },

    resetController(controller) {
        controller.fromAnalytics = false;
    },

    deactivate() {
        this._super(...arguments);
        this.ui.set('isFullScreen', false);
    },

    actions: {
        save() {
            this._blurAndScheduleAction(function () {
                this.controller.send('save');
            });
        },

        authorizationFailed() {
            // noop - re-auth is handled by controller save
            return;
        },

        willTransition(transition) {
            // exit early if an upgrade is required because our extended route
            // class will abort the transition and show an error
            if (this.get('upgradeStatus.isRequired')) {
                return this._super(...arguments);
            }

            this.controller.willTransition(transition);
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: () => {
                return this.get('controller.post.title') || 'Editor';
            },
            bodyClasses: ['gh-body-fullscreen'],
            mainClasses: ['gh-main-white']
        };
    },

    // Built by hand rather than with `router.urlFor`, whose output depends
    // on the configured location — it returns `/ghost/editor/...` under the
    // `none` location used in tests but `#/editor/...` under `trailing-hash`
    // in the app. Unlike the list routes the editor has dynamic segments, so
    // the path comes from the target route's own params. Every Ember-initiated
    // transition into the editor passes string params, so `transition.to` has
    // them serialized already.
    _reactRouteUrl(transition) {
        const {name, params} = transition.to ?? {};

        if (name === 'lexical-editor.edit' && params?.type && params?.post_id) {
            return `/editor/${params.type}/${params.post_id}`;
        }
        if (name === 'lexical-editor.new' && params?.type) {
            return `/editor/${params.type}`;
        }

        return '/editor';
    },

    // Aborting stops Ember rendering this screen, but it also leaves the
    // router believing it is still on the route we came from. That desync is
    // only invisible until you navigate back to the very same URL: Ember
    // compares it against the route it thinks it is on, finds no difference,
    // and runs no transition at all. Park on `react-fallback` — the empty
    // catch-all Ember already uses for URLs React owns — to keep the
    // router's state honest. See PostsRoute#_parkOnReactFallback for the
    // full rationale (replace semantics, the parked-path guard, and URL
    // restoration).
    _parkOnReactFallback() {
        const parkedPath = this.router.currentRouteName === 'react-fallback'
            ? this.router.currentRoute?.params?.path
            : null;

        if (parkedPath === this.routeName) {
            return;
        }

        const url = window.location.hash;
        const state = window.history.state;

        this.router.replaceWith('react-fallback', this.routeName)
            .finally(() => this._restoreUrl(url, state));
    },

    // Parking writes the fallback route's own path, so the captured URL goes
    // back afterwards. `replaceState`: no history entry, and no `hashchange`
    // to re-enter routing. The captured history state goes back too —
    // react-router keeps `{usr, key, idx}` there and a `null` state breaks
    // its back/forward index and useBlocker.
    _restoreUrl(url, state) {
        window.history.replaceState(state, '', url);
    },

    // Seam so tests can assert the navigation without a real hash location —
    // Ember acceptance tests run with `location: 'none'`.
    _navigateToReactRoute(url) {
        window.location.hash = url;
    },

    _blurAndScheduleAction(func) {
        let selectedElement = $(document.activeElement);

        // TODO: we should trigger a blur for textareas as well as text inputs
        if (selectedElement.is('input[type="text"]')) {
            selectedElement.trigger('focusout');
        }

        // wait for actions triggered by the focusout to finish before saving
        run.scheduleOnce('actions', this, func);
    }
});
