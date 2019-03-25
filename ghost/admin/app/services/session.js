import RSVP from 'rsvp';
import SessionService from 'ember-simple-auth/services/session';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default SessionService.extend({
    feature: service(),
    dataStore: service('store'), // SessionService.store already exists
    tour: service(),

    user: computed(function () {
        return this.dataStore.queryRecord('user', {id: 'me'});
    }),

    authenticate() {
        // ensure any cached this.user value is removed and re-fetched
        this.notifyPropertyChange('user');

        return this._super(...arguments).then((authResult) => {
            // TODO: remove duplication with application.afterModel
            let preloadPromises = [
                this.feature.fetch(),
                this.tour.fetchViewed()
            ];

            return RSVP.all(preloadPromises).then(() => authResult);
        });
    }
});
