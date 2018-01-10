import $ from 'jquery';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    settings: service(),

    titleToken: 'Settings - Design',
    classNames: ['settings-view-design'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model() {
        return RSVP.hash({
            settings: this.get('settings').reload(),
            themes: this.get('store').findAll('theme')
        });
    },

    setupController(controller) {
        // reset the leave setting transition
        controller.set('leaveSettingsTransition', null);
        controller.set('themes', this.get('store').peekAll('theme'));
        this.get('controller').send('reset');
    },

    actions: {
        save() {
            // since shortcuts are run on the route, we have to signal to the components
            // on the page that we're about to save.
            $('.page-actions .gh-btn-blue').focus();

            this.get('controller').send('save');
        },

        willTransition(transition) {
            let controller = this.get('controller');
            let modelIsDirty = controller.get('dirtyAttributes');

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        },

        activateTheme(theme) {
            return this.get('controller').send('activateTheme', theme);
        }
    }
});
