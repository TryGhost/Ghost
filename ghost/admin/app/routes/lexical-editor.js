import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const POSTS_ANALYTICS_ROUTE = 'posts-x';
const STATS_ANALYTICS_ROUTE = 'stats-x';

/**
 * Checks whether a route name belongs to a route family.
 * @param {string|undefined|null} routeName - Current route name.
 * @param {string} routeFamily - Base route family name.
 * @returns {boolean}
 */
function isInRouteFamily(routeName, routeFamily) {
    return routeName === routeFamily || routeName?.startsWith(`${routeFamily}.`);
}

/**
 * Reads a dynamic segment from the previous route info in a transition.
 * @param {object|undefined} transition - Ember transition object.
 * @param {string} paramName - Dynamic segment name to resolve.
 * @returns {string|undefined}
 */
function getTransitionParam(transition, paramName) {
    let routeInfo = transition?.from;

    if (!routeInfo) {
        return undefined;
    }

    return routeInfo.params?.[paramName] ?? routeInfo.parent?.params?.[paramName];
}

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
    let fromRouteName = transition?.from?.name;
    let queryString = buildQueryString(transition?.from?.queryParams);

    if (isInRouteFamily(fromRouteName, POSTS_ANALYTICS_ROUTE)) {
        let postId = getTransitionParam(transition, 'post_id') || model?.id;

        if (!postId) {
            return false;
        }

        let sub = getTransitionParam(transition, 'sub');
        let basePath = sub
            ? `/posts/analytics/${postId}/${sub}`
            : `/posts/analytics/${postId}`;

        return `${basePath}${queryString}`;
    }

    if (isInRouteFamily(fromRouteName, STATS_ANALYTICS_ROUTE)) {
        let sub = getTransitionParam(transition, 'sub');
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
