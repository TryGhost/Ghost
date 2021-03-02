import Authenticator from 'ember-simple-auth/authenticators/base';
import RSVP from 'rsvp';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Authenticator.extend({
    ajax: service(),
    config: service(),
    feature: service(),
    ghostPaths: service(),
    settings: service(),
    whatsNew: service(),

    sessionEndpoint: computed('ghostPaths.apiRoot', function () {
        return `${this.ghostPaths.apiRoot}/session`;
    }),

    restore: function () {
        return RSVP.resolve();
    },

    authenticate(identification, password) {
        const data = {username: identification, password};
        const options = {
            data,
            contentType: 'application/json;charset=utf-8',
            // ember-ajax will try and parse the response as JSON if not explicitly set
            dataType: 'text'
        };

        return this.ajax.post(this.sessionEndpoint, options).then((authResult) => {
            // TODO: remove duplication with application.afterModel
            let preloadPromises = [
                this.config.fetchAuthenticated(),
                this.feature.fetch(),
                this.settings.fetch()
            ];

            // kick off background update of "whats new"
            // - we don't want to block the router for this
            // - we need the user details to know what the user has seen
            this.whatsNew.fetchLatest.perform();

            return RSVP.all(preloadPromises).then(() => {
                return authResult;
            });
        });
    },

    invalidate() {
        // if we're invalidating because of a 401 we can end up in an infinite
        // loop if we then try to perform a DELETE /session/ request
        // TODO: find a more elegant way to handle this
        if (this.ajax.skipSessionDeletion) {
            this.ajax.skipSessionDeletion = false;
            return RSVP.resolve();
        }

        return this.ajax.del(this.sessionEndpoint);
    }
});
