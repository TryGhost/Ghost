import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import injectService from 'ember-service/inject';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    config: injectService(),
    settings: injectService(),

    titleToken: 'Settings - General',
    classNames: ['settings-view-general'],

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        return RSVP.hash({
            settings: this.get('settings').reload(),
            availableTimezones: this.get('config.availableTimezones')
        });
    },

    setupController(controller, models) {
        controller.set('model', models.settings);
        controller.set('themes', this.get('store').peekAll('theme'));
        controller.set('availableTimezones', models.availableTimezones);
    },

    actions: {
        save() {
            return this.get('controller').send('save');
        },

        reloadSettings() {
            return this.get('settings').reload();
        }
    }
});
