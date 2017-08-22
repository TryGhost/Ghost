import Ember from 'ember';
import Test from 'ember-test'; // eslint-disable-line

// This is needed for testing error responses in acceptance tests
// See http://williamsbdev.com/posts/testing-rsvp-errors-handled-globally/

// ember-cli-shims doesn't export Logger
const {Logger} = Ember;

let originalException, originalLoggerError;

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
