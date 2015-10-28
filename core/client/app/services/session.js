import Ember from 'ember';
import SessionService from 'ember-simple-auth/services/session';

const {computed, inject} = Ember;

export default SessionService.extend({
    store: inject.service(),

    user: computed(function () {
        return this.get('store').findRecord('user', 'me');
    })
});
