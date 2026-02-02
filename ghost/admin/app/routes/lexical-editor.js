import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

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
        // Check for fromAnalytics query param to determine back navigation
        // Note: Ghost uses hash-based routing, so query params are in the hash portion
        const hash = window.location.hash;
        const queryIndex = hash.indexOf('?');
        if (queryIndex !== -1) {
            const params = new URLSearchParams(hash.slice(queryIndex));
            const fromAnalytics = params.get('fromAnalytics');

            if (fromAnalytics && transition.to?.name !== 'lexical-editor.new') {
                controller.fromAnalytics = fromAnalytics;
            }
        }
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
