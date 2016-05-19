import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

const {
    RSVP,
    inject: {service}
} = Ember;

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - General',

    classNames: ['settings-view-general'],

    config: service(),

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
