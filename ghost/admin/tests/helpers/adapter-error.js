import Ember from 'ember';

// This is needed for testing error responses in acceptance tests
// See http://williamsbdev.com/posts/testing-rsvp-errors-handled-globally/

const {Test, Logger} = Ember;

let originalException;
let originalLoggerError;

export function errorOverride() {
    originalException = Test.adapter.exception;
    originalLoggerError = Logger.error;
    Test.adapter.exception = function () {};
    Logger.error = function () {};
}

export function errorReset() {
    Test.adapter.exception = originalException;
    Logger.error = originalLoggerError;
}
