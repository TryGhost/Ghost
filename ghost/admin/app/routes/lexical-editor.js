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
        if (transition.to?.name === 'lexical-editor.new') {
            return;
        }

        if (transition.from?.name?.includes('posts-x')) {
            // Came from post analytics - reconstruct the full analytics URL including tab
            let postId = transition.from?.parent?.params?.post_id || transition.from?.params?.post_id;
            if (!postId) {
                // Fallback: extract post ID from the editor URL hash
                let hashMatch = window.location.hash.match(/\/editor\/\w+\/([a-f0-9]+)/);
                postId = hashMatch?.[1] || model?.id;
            }
            let sub = transition.from?.params?.sub;
            controller.fromAnalytics = sub
                ? `/posts/analytics/${postId}/${sub}`
                : `/posts/analytics/${postId}`;
        } else if (transition.from?.name?.includes('stats-x')) {
            // Came from stats overview
            controller.fromAnalytics = '/analytics';
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
