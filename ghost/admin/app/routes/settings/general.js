import RSVP from 'rsvp';
import injectService from 'ember-service/inject';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - General',

    classNames: ['settings-view-general'],

    config: injectService(),

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        return RSVP.hash({
            settings: this.store.queryRecord('setting', {type: 'blog,theme,private'}),
            availableTimezones: this.get('config.availableTimezones')
        });
    },

    setupController(controller, models) {
        controller.set('model', models.settings);
        controller.set('availableTimezones', models.availableTimezones);
    },

    actions: {
        save() {
            this.get('controller').send('save');
        }
    }
});
