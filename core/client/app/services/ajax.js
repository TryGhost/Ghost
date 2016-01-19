import Ember from 'ember';
import AjaxService from 'ember-ajax/services/ajax';

const {inject, computed} = Ember;

export default AjaxService.extend({
    session: inject.service(),

    headers: computed('session.isAuthenticated', function () {
        let session = this.get('session');

        if (session.get('isAuthenticated')) {
            let headers = {};

            session.authorize('authorizer:oauth2', (headerName, headerValue) => {
                headers[headerName] = headerValue;
            });

            return headers;
        } else {
            return [];
        }
    }),

    normalizeErrorResponse(status, headers, payload) {
        if (payload && typeof payload === 'object') {
            return payload.error || payload.errors || payload.message || false;
        } else {
            return false;
        }
    }
});
