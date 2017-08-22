import RSVP from 'rsvp';
import SessionService from 'ember-simple-auth/services/session';
import {computed} from '@ember/object';
import {inject as injectService} from '@ember/service';

export default SessionService.extend({
    feature: injectService(),
    store: injectService(),
    tour: injectService(),

    user: computed(function () {
        return this.get('store').queryRecord('user', {id: 'me'});
    }),

    authenticate() {
        return this._super(...arguments).then((authResult) => {
            // TODO: remove duplication with application.afterModel
            let preloadPromises = [
                this.get('feature').fetch(),
                this.get('tour').fetchViewed()
            ];

            return RSVP.all(preloadPromises).then(() => {
                return authResult;
            });
        });
    }
});
