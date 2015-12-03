import Ember from 'ember';

// This is needed for testing error responses in acceptance tests
// See http://williamsbdev.com/posts/testing-rsvp-errors-handled-globally/

let originalException;
let originalLoggerError;

export function errorOverride() {
    originalException = Ember.Test.adapter.exception;
    originalLoggerError = Ember.Logger.error;
    Ember.Test.adapter.exception = function () {};
    Ember.Logger.error = function () {};
}

export function errorReset() {
    Ember.Test.adapter.exception = originalException;
    Ember.Logger.error = originalLoggerError;
}
