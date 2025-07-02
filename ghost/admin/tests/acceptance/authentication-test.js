import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {Response} from 'miragejs';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {click, currentRouteName, currentURL, fillIn, find, findAll, triggerKeyEvent, visit, waitFor, waitUntil} from '@ember/test-helpers';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

function setupVerificationRequired(server, responseCode = 403) {
    server.post('/session', function () {
        return new Response(responseCode, {}, {
            errors: [{
                code: '2FA_TOKEN_REQUIRED'
            }]
        });
    });
}

function setupVerificationSuccess(server) {
    server.put('/session/verify', function () {
        return new Response(201);
    });
}

function setupVerificationFailed(server) {
    server.put('/session/verify', function () {
        return new Response(401, {}, null);
    });
}

function setupResendSuccess(server, {timing = 0}) {
    // API returns 'OK' in API response - this is important as it will cause
    // errors to be thrown if we try to parse it as JSON
    server.post('/session/verify', function () {
        return new Response(200, {}, 'OK');
    }, {timing});
}

function setupResendFailure(server, {responseCode = 400, timing = 0, message} = {}) {
    server.post('/session/verify', function () {
        if (message) {
            return new Response(responseCode, {}, {
                errors: [{
                    message
                }]
            });
        }

        return new Response(responseCode);
    }, {timing});
}
describe('Acceptance: Authentication', function () {
    let originalReplaceLocation;

    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
    });

    describe('setup redirect', function () {
        beforeEach(function () {
            // ensure the /users/me route doesn't error
            this.server.create('user');
            this.server.get('authentication/setup', function () {
                return {setup: [{status: false}]};
            });
        });
        it('redirects to setup when setup isn\'t complete', async function () {
            await visit('settings/labs');
            expect(currentURL()).to.equal('/setup');
        });
    });

    describe('general page', function () {
        let newLocation;

        const verifyButton = '[data-test-button="verify"]';
        const resendButton = '[data-test-button="resend-token"]';
        const codeInput = '[data-test-input="token"]';

        async function completeSignIn() {
            await invalidateSession();
            await visit('/signin');
            await fillIn('[data-test-input="email"]', 'my@email.com');
            await fillIn('[data-test-input="password"]', 'password');
            await click('[data-test-button="sign-in"]');
        }

        async function completeVerification() {
            await fillIn(codeInput, 123456);
            await click(verifyButton);
        }

        function testMainErrorMessage(expectedMessage) {
            expect(find('[data-test-flow-notification]')).to.have.trimmed.text(expectedMessage);
        }

        function testTokenInputHasErrorState(expectHasError = true) {
            if (expectHasError) {
                expect(find(codeInput).closest('.form-group')).to.have.class('error');
            } else {
                expect(find(codeInput).closest('.form-group')).not.to.have.class('error');
            }
        }

        function testButtonHasErrorState(expectHasError = true) {
            if (expectHasError) {
                expect(find(verifyButton)).to.have.class('gh-btn-red');
            } else {
                expect(find(verifyButton)).not.to.have.class('gh-btn-red');
            }
        }

        beforeEach(function () {
            originalReplaceLocation = windowProxy.replaceLocation;
            windowProxy.replaceLocation = function (url) {
                url = url.replace(/^\/ghost\//, '/');
                newLocation = url;
            };
            newLocation = undefined;

            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role], slug: 'test-user'});
        });

        afterEach(function () {
            windowProxy.replaceLocation = originalReplaceLocation;
        });

        it('invalidates session on 401 API response', async function () {
            // return a 401 when attempting to retrieve users
            this.server.get('/users/me', () => new Response(401, {}, {
                errors: [
                    {message: 'Access denied.', type: 'UnauthorizedError'}
                ]
            }));

            await authenticateSession();
            await visit('/members');

            // running `visit(url)` inside windowProxy.replaceLocation breaks
            // the async behaviour so we need to run `visit` here to simulate
            // the browser visiting the new page
            if (newLocation) {
                await visit(newLocation);
            }

            expect(currentURL(), 'url after 401').to.equal('/signin');
        });

        it('invalidates session on 403 API response', async function () {
            // return a 401 when attempting to retrieve users
            this.server.get('/users/me', () => new Response(403, {}, {
                errors: [
                    {message: 'Authorization failed', type: 'NoPermissionError'}
                ]
            }));

            await authenticateSession();
            await visit('/members');

            // running `visit(url)` inside windowProxy.replaceLocation breaks
            // the async behaviour so we need to run `visit` here to simulate
            // the browser visiting the new page
            if (newLocation) {
                await visit(newLocation);
            }

            expect(currentURL(), 'url after 403').to.equal('/signin');
        });

        it('doesn\'t show navigation menu on invalid url when not authenticated', async function () {
            await invalidateSession();
            await visit('/');

            expect(currentURL(), 'current url').to.equal('/signin');
            expect(findAll('nav.gh-nav').length, 'nav menu presence').to.equal(0);

            await visit('/signin/invalidurl/');

            expect(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
            expect(currentRouteName(), 'path after invalid url').to.equal('error404');
            expect(findAll('nav.gh-nav').length, 'nav menu presence').to.equal(0);
        });

        it('shows nav menu on invalid url when authenticated', async function () {
            await authenticateSession();
            await visit('/signin/invalidurl/');

            expect(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
            expect(currentRouteName(), 'path after invalid url').to.equal('error404');
            expect(findAll('nav.gh-nav').length, 'nav menu presence').to.equal(1);
        });

        it('has 2fa code happy path', async function () {
            setupVerificationRequired(this.server);
            setupVerificationSuccess(this.server);

            await completeSignIn();
            expect(currentURL(), 'url after email+password submit').to.equal('/signin/verify');
            await completeVerification();
            expect(currentURL()).to.equal('/dashboard');
        });

        it('handles 2fa code verification failure', async function () {
            setupVerificationRequired(this.server);
            setupVerificationFailed(this.server);

            await completeSignIn();
            await completeVerification();

            testMainErrorMessage('Your verification code is incorrect.');
        });

        it('handles known 2fa code verification error', async function () {
            setupVerificationRequired(this.server);
            this.server.put('/session/verify', function () {
                return new Response(422, {}, {
                    errors: [{
                        message: 'Could not find session. Please try to signin again.'
                    }]
                });
            });

            await completeSignIn();
            await completeVerification();

            testMainErrorMessage('Could not find session. Please try to signin again.');
        });

        it('handles unknown 2fa code verification error', async function () {
            setupVerificationRequired(this.server);
            this.server.put('/session/verify', function () {
                return new Response(400);
            });

            await completeSignIn();
            await completeVerification();

            testMainErrorMessage('There was a problem verifying the code. Please try again.');
        });

        it('handles 2fa-required on a 2xx response from signin', async function () {
            setupVerificationRequired(this.server, 200);
            await completeSignIn();

            expect(currentURL(), 'url after email+password submit').to.equal('/signin/verify');
        });

        it('handles non-2fa 403 response on signin', async function () {
            this.server.post('/session', function () {
                return new Response(403, {}, {
                    errors: [{message: 'Insufficient permissions'}]
                });
            });

            await completeSignIn();

            expect(currentURL(), 'url after email+password submit').to.equal('/signin');
            testMainErrorMessage('Insufficient permissions');
        });

        it('has client-side validation of verification code', async function () {
            setupVerificationRequired(this.server);
            await completeSignIn();

            // no error state when starting flow
            testTokenInputHasErrorState(false);
            testButtonHasErrorState(false);
            testMainErrorMessage('');

            // client-side validation of token presence
            await click(verifyButton);
            testTokenInputHasErrorState();
            testMainErrorMessage('Verification code is required');

            // resets validation state when typing
            await fillIn(codeInput, '1234');
            testTokenInputHasErrorState(false);
            testButtonHasErrorState(false);
            testMainErrorMessage('');

            // client-side validation of token format
            await click(verifyButton);
            testTokenInputHasErrorState();
            testButtonHasErrorState();
            testMainErrorMessage('Verification code must be 6 numbers');

            // can correctly submit after failed attempts
            await fillIn(codeInput, '123456');
            await click(verifyButton);
            expect(currentURL()).to.equal('/dashboard');
        });

        it('can resend verification code', async function () {
            setupVerificationRequired(this.server);
            setupResendSuccess(this.server, {timing: 100});
            await completeSignIn();

            // no await so we can test for intermediary state
            click(resendButton);

            // await this.pauseTest();
            await waitFor(`${resendButton}[disabled]`, {timeout: 10});
            await waitUntil(() => find(resendButton).textContent.includes('Sending'), {timeout: 30, timeoutMessage: 'Check for "Sending" timed out'});
            await waitUntil(() => find(resendButton).textContent.includes('Sent'), {timeout: 150, timeoutMessage: 'Check for "Sent" timed out'});
            await waitFor(`${resendButton}:not([disabled])`, {timeout: 200});
            expect(find(resendButton)).to.have.trimmed.text('Resend');
        });

        it('handles resend error', async function () {
            setupVerificationRequired(this.server);
            await completeSignIn();

            // default error message
            setupResendFailure(this.server);
            await click(resendButton);
            testMainErrorMessage('There was a problem resending the verification token.');

            // server-provided error message
            setupResendFailure(this.server, {message: 'Testing error.'});
            await click(resendButton);
            testMainErrorMessage('Testing error.');
        });
    });

    describe('editor', function () {
        let origDebounce = run.debounce;
        let origThrottle = run.throttle;

        // we don't want the autosave interfering in this test
        beforeEach(function () {
            run.debounce = function () { };
            run.throttle = function () { };
        });

        it('displays re-auth modal attempting to save with invalid session', async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});
            let testOn = 'save'; // use marker for different type of server.put result

            // simulate an invalid session when saving the edited post
            this.server.put('/posts/:id/', function ({posts, db}, {params}) {
                let post = posts.find(params.id);
                let attrs = db.posts.find(params.id); // use attribute from db.posts to avoid hasInverseFor error

                if (testOn === 'edit') {
                    return new Response(401, {}, {
                        errors: [
                            {message: 'Access denied.', type: 'UnauthorizedError'}
                        ]
                    });
                } else {
                    return post.update(attrs);
                }
            });

            await authenticateSession();

            await visit('/editor');

            // create the post
            await fillIn('.gh-editor-title', 'Test Post');
            // await fillIn('.kg-prose', 'Test post body'); // TODO: We don't currently have an editorInstance when loading Lexical as the editor.. need to look in to this
            await triggerKeyEvent('.gh-editor-title', 'keydown', 83, {
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            // we shouldn't have a modal at this point
            expect(findAll('[data-test-modal="re-authenticate"]').length, 'modal exists').to.equal(0);
            // we also shouldn't have any alerts
            expect(findAll('.gh-alert').length, 'no of alerts').to.equal(0);

            // update the post
            testOn = 'edit';
            await fillIn('.gh-editor-title', 'Test Post Updated');
            triggerKeyEvent('.gh-editor-title', 'keydown', 83, {
                metaKey: ctrlOrCmd === 'command',
                ctrlKey: ctrlOrCmd === 'ctrl'
            });

            // we should see a re-auth modal
            await waitFor('[data-test-modal="re-authenticate"]', {timeout: 100});

            // close the modal so the modal promise is settled and we can continue
            await triggerKeyEvent('[data-test-modal="re-authenticate"]', 'keydown', 'Escape');
        });

        // don't clobber debounce/throttle for future tests
        afterEach(function () {
            run.debounce = origDebounce;
            run.throttle = origThrottle;
        });
    });
});
