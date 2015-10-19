import Ember from 'ember';
import SessionService from 'ember-simple-auth/services/session';

export default SessionService.extend({
    store: Ember.inject.service(),

    user: Ember.computed(function () {
        return this.get('store').findRecord('user', 'me');
    })
});
