import Ember from 'ember';
import AjaxService from 'ember-ajax/services/ajax';
import {AjaxError} from 'ember-ajax/errors';

const {inject, computed} = Ember;

export function RequestEntityTooLargeError(errors) {
    AjaxError.call(this, errors, 'Request was rejected because it\'s larger than the maximum file size the server allows');
}

export function UnsupportedMediaTypeError(errors) {
    AjaxError.call(this, errors, 'Request was rejected because it contains an unknown or unsupported file type.');
}

// TODO: remove once upgraded to ember-ajax 2.0
export function NotFoundError(errors) {
    AjaxError.call(this, errors, 'Resource was not found.');
}

NotFoundError.prototype = Object.create(AjaxError.prototype);

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

    handleResponse(status, headers, payload) {
        if (this.isRequestEntityTooLarge(status, headers, payload)) {
            return new RequestEntityTooLargeError(payload.errors);
        } else if (this.isUnsupportedMediaType(status, headers, payload)) {
            return new UnsupportedMediaTypeError(payload.errors);
        } else if (this.isNotFoundError(status, headers, payload)) {
            return new NotFoundError(payload.errors);
        }

        return this._super(...arguments);
    },

    normalizeErrorResponse(status, headers, payload) {
        if (payload && typeof payload === 'object') {
            payload.errors = payload.error || payload.errors || payload.message || undefined;
        }

        return this._super(status, headers, payload);
    },

    isRequestEntityTooLarge(status/*, headers, payload */) {
        return status === 413;
    },

    isUnsupportedMediaType(status/*, headers, payload */) {
        return status === 415;
    },

    isNotFoundError(status) {
        return status === 404;
    }
});
