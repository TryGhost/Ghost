import Ember from 'ember';
import SessionService from 'ember-simple-auth/services/session';

const {
    computed,
    inject: {service}
} = Ember;

export default SessionService.extend({
    store: service(),

    user: computed(function () {
        return this.get('store').findRecord('user', 'me');
    })
});
