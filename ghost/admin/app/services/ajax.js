import Ember from 'ember';
import AjaxService from 'ember-ajax/services/ajax';
import {AjaxError, isAjaxError} from 'ember-ajax/errors';
import config from 'ghost-admin/config/environment';

const {
    computed,
    inject,
    isArray
} = Ember;

export function RequestEntityTooLargeError(errors) {
    AjaxError.call(this, errors, 'Request was rejected because it\'s larger than the maximum file size the server allows');
}

RequestEntityTooLargeError.prototype = Object.create(AjaxError.prototype);

export function isRequestEntityTooLargeError(error) {
    if (isAjaxError(error)) {
        return error instanceof RequestEntityTooLargeError;
    } else {
        return error === 413;
    }
}

export function UnsupportedMediaTypeError(errors) {
    AjaxError.call(this, errors, 'Request was rejected because it contains an unknown or unsupported file type.');
}

UnsupportedMediaTypeError.prototype = Object.create(AjaxError.prototype);

export function isUnsupportedMediaTypeError(error) {
    if (isAjaxError(error)) {
        return error instanceof UnsupportedMediaTypeError;
    } else {
        return error === 415;
    }
}

export default AjaxService.extend({
    session: inject.service(),

    headers: computed('session.isAuthenticated', function () {
        let session = this.get('session');
        let headers = {};

        headers['X-Ghost-Version'] = config.APP.version;

        if (session.get('isAuthenticated')) {
            session.authorize('authorizer:oauth2', (headerName, headerValue) => {
                headers[headerName] = headerValue;
            });
        }

        return headers;
    }),

    handleResponse(status, headers, payload) {
        if (this.isRequestEntityTooLargeError(status, headers, payload)) {
            return new RequestEntityTooLargeError(payload.errors);
        } else if (this.isUnsupportedMediaTypeError(status, headers, payload)) {
            return new UnsupportedMediaTypeError(payload.errors);
        }

        return this._super(...arguments);
    },

    normalizeErrorResponse(status, headers, payload) {
        if (payload && typeof payload === 'object') {
            payload.errors = payload.error || payload.errors || payload.message || undefined;

            if (isArray(payload.errors)) {
                payload.errors = payload.errors.map(function(error) {
                    if (typeof error === 'string') {
                        return {message: error};
                    } else {
                        return error;
                    }
                });
            }
        }

        return this._super(status, headers, payload);
    },

    isRequestEntityTooLargeError(status/*, headers, payload */) {
        return isRequestEntityTooLargeError(status);
    },

    isUnsupportedMediaTypeError(status/*, headers, payload */) {
        return isUnsupportedMediaTypeError(status);
    }
});
