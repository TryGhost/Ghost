import SessionService from 'ember-simple-auth/services/session';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default SessionService.extend({
    dataStore: service('store'), // SessionService.store already exists

    user: computed(function () {
        return this.dataStore.queryRecord('user', {id: 'me'});
    }),

    authenticate() {
        // ensure any cached this.user value is removed and re-fetched
        this.notifyPropertyChange('user');

        return this._super(...arguments);
    }
});
