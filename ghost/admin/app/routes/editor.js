import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {run} from '@ember/runloop';

let generalShortcuts = {};
generalShortcuts[`${ctrlOrCmd}+shift+p`] = 'publish';

export default AuthenticatedRoute.extend(ShortcutsRoute, {
    classNames: ['editor'],
    shortcuts: generalShortcuts,
    titleToken: 'Editor',

    actions: {
        save() {
            this._blurAndScheduleAction(function () {
                this.get('controller').send('save');
            });
        },

        publish() {
            this._blurAndScheduleAction(function () {
                this.get('controller').send('setSaveType', 'publish');
                this.get('controller').send('save');
            });
        },

        authorizationFailed() {
            this.get('controller').send('toggleReAuthenticateModal');
        },

        redirectToContentScreen() {
            this.transitionTo('posts');
        },

        willTransition(transition) {
            // exit early if an upgrade is required because our extended route
            // class will abort the transition and show an error
            if (this.get('upgradeStatus.isRequired')) {
                return this._super(...arguments);
            }

            this.get('controller').willTransition(transition);
        }
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
