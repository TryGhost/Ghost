/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import Ember from 'ember';
import startApp from '../helpers/start-app';
import { authenticateSession, currentSession, invalidateSession } from 'ghost/tests/helpers/ember-simple-auth';
import Mirage from 'ember-cli-mirage';

const {run} = Ember;

/* jshint ignore:start */
/* global onerrorDefault */
/* jscs:disable */
// ember packages aren't directly importable so this is copied from:
// https://github.com/emberjs/ember.js/blob/v1.13.10/packages/ember-runtime/lib/ext/rsvp.js
function onerrorDefault(e) {
    var error;

    if (e && e.errorThrown) {
        // jqXHR provides this
        error = e.errorThrown;
        if (typeof error === 'string') {
            error = new Error(error);
        }
        error.__reason_with_error_thrown__ = e;
    } else {
        error = e;
    }

    if (error && error.name !== 'TransitionAborted') {
        if (Ember.testing) {
            // ES6TODO: remove when possible
            if (!Test && Ember.__loader.registry[testModuleName]) {
                Test = requireModule(testModuleName)['default'];
            }

            if (Test && Test.adapter) {
                Test.adapter.exception(error);
                Logger.error(error.stack);
            } else {
                throw error;
            }
        } else if (Ember.onerror) {
            Ember.onerror(error);
        } else {
            Logger.error(error.stack);
        }
    }
}
/* jshint ignore:end */
/* jscs:enable */

describe('Acceptance: Authentication', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        run(application, 'destroy');
    });

    describe('tag settings screen', function () {
        beforeEach(function () {
            server.loadFixtures();
            server.createList('tag', 5);

            // HACK:
            // https://github.com/emberjs/ember.js/blob/v1.13.10/packages/ember-runtime/lib/ext/rsvp.js#L54:L65
            // logs the error before it gets to our app route error handler and breaks the test.
            // Different behaviour only in testing, why not? ¯\_(ツ)_/¯
            // Workaround is to disable RSVP's error handling for this test
            // TODO: Remove if the bug is fixed, issue has been raised at https://github.com/emberjs/ember.js/issues/12567
            Ember.RSVP.off('error');
        });

        afterEach(function () {
            // Turn RSVP's error handling back on
            Ember.RSVP.on('error', onerrorDefault);
        });

        it('redirects to sign-in with no session', function () {
            invalidateSession(application);
            visit('/settings/tags');

            andThen(() => {
                expect(currentURL()).to.equal('/signin');
            });
        });

        it('invalidates session on 401 API response', function () {
            // On a clean load /users/me is the first-hit endpoint that
            // returns a 401 when the session is invalid
            server.get('/users/me', (db, request) => {
                return new Mirage.Response(401, {}, {
                    errors: [
                        {message: 'Access denied.', errorType: 'UnauthorizedError'}
                    ]
                });
            });

            authenticateSession(application);
            visit('/settings/tags');

            // we can't test the actual redirect as ESA doesn't hit
            // window.location.reload whilst in testing but we can check that
            // the session was invalidated successfully
            wait().then(() => {
                let session = currentSession(application);
                expect(session.get('isDestroyed'), 'session.isDestroyed after 401')
                    .to.be.true;
            });
        });
    });

    describe('editor', function () {
        let origDebounce = Ember.run.debounce;
        let origThrottle = Ember.run.throttle;

        // we don't want the autosave interfering in this test
        beforeEach(function () {
            Ember.run.debounce = function () { };
            Ember.run.throttle = function () { };
        });

        it('displays re-auth modal attempting to save with invalid session', function () {
            const role = server.create('role', {name: 'Administrator'}),
                  user = server.create('user', {roles: [role]});

            // simulate an invalid session when saving the edited post
            server.put('/posts/:id/', (db, request) => {
                let post = db.posts.find(request.params.id),
                    [attrs] = JSON.parse(request.requestBody).posts;

                if (attrs.markdown === 'Edited post body') {
                    return new Mirage.Response(401, {}, {
                        errors: [
                            {message: 'Access denied.', errorType: 'UnauthorizedError'}
                        ]
                    });
                } else {
                    return {
                        posts: [post]
                    };
                }
            });

            server.loadFixtures();
            authenticateSession(application);

            visit('/editor');

            // create the post
            fillIn('#entry-title', 'Test Post');
            fillIn('textarea.markdown-editor', 'Test post body');
            click('.js-publish-button');

            andThen(() => {
                // we shouldn't have a modal at this point
                expect(find('.modal-container #login').length, 'modal exists').to.equal(0);
                // we also shouldn't have any alerts
                expect(find('.gh-alert').length, 'no of alerts').to.equal(0);
            });

            // update the post
            fillIn('textarea.markdown-editor', 'Edited post body');
            click('.js-publish-button');

            andThen(() => {
                // we should see a re-auth modal
                expect(find('.modal-container #login').length, 'modal exists').to.equal(1);
            });
        });

        // don't clobber debounce/throttle for future tests
        afterEach(function () {
            Ember.run.debounce = origDebounce;
            Ember.run.throttle = origThrottle;
        });
    });
});
