import $ from 'jquery';
import OAuth2Authenticator from 'ghost-admin/authenticators/oauth2';
import destroyApp from '../helpers/destroy-app';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import startApp from '../helpers/start-app';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {Response} from 'ember-cli-mirage';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';
import {run} from '@ember/runloop';

const Ghost = ghostPaths();

describe('Acceptance: Authentication', function () {
    let application,
        originalReplaceLocation;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    describe('setup redirect', function () {
        beforeEach(function () {
            // ensure the /users/me route doesn't error
            server.create('user');

            server.get('authentication/setup', function () {
                return {setup: [{status: false}]};
            });
        });

        it('redirects to setup when setup isn\'t complete', async function () {
            await visit('settings/labs');

            expect(currentURL()).to.equal('/setup/one');
        });
    });

    describe('token handling', function () {
        beforeEach(function () {
            // replace the default test authenticator with our own authenticator
            application.register('authenticator:test', OAuth2Authenticator);

            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role], slug: 'test-user'});
        });

        it('refreshes tokens on boot if last refreshed > 24hrs ago', async function () {
            /* eslint-disable camelcase */
            // the tokens here don't matter, we're using the actual oauth
            // authenticator so we get the tokens back from the mirage endpoint
            await authenticateSession(application, {
                access_token: 'access_token',
                refresh_token: 'refresh_token'
            });

            // authenticating the session above will trigger a token refresh
            // request so we need to clear it to ensure we aren't testing the
            // test behaviour instead of application behaviour
            server.pretender.handledRequests = [];

            // fake a longer session so it appears that we last refreshed > 24hrs ago
            let {__container__: container} = application;
            let {session} = container.lookup('service:session');
            let newSession = session.get('content');
            newSession.authenticated.expires_in = 172800 * 2;
            session.get('store').persist(newSession);
            /* eslint-enable camelcase */

            await visit('/');

            let requests = server.pretender.handledRequests;
            let refreshRequest = requests.findBy('url', '/ghost/api/v0.1/authentication/token');

            expect(refreshRequest, 'token refresh request').to.exist;
            expect(refreshRequest.method, 'method').to.equal('POST');

            let requestBody = $.deparam(refreshRequest.requestBody);
            expect(requestBody.grant_type, 'grant_type').to.equal('refresh_token');
            expect(requestBody.refresh_token, 'refresh_token').to.equal('MirageRefreshToken');
        });

        it('doesn\'t refresh tokens on boot if last refreshed < 24hrs ago', async function () {
            /* eslint-disable camelcase */
            // the tokens here don't matter, we're using the actual oauth
            // authenticator so we get the tokens back from the mirage endpoint
            await authenticateSession(application, {
                access_token: 'access_token',
                refresh_token: 'refresh_token'
            });
            /* eslint-enable camelcase */

            // authenticating the session above will trigger a token refresh
            // request so we need to clear it to ensure we aren't testing the
            // test behaviour instead of application behaviour
            server.pretender.handledRequests = [];

            // we've only just refreshed tokens above so we should always be < 24hrs
            await visit('/');

            let requests = server.pretender.handledRequests;
            let refreshRequest = requests.findBy('url', '/ghost/api/v0.1/authentication/token');

            expect(refreshRequest, 'refresh request').to.not.exist;
        });
    });

    describe('general page', function () {
        let newLocation;

        beforeEach(function () {
            originalReplaceLocation = windowProxy.replaceLocation;
            windowProxy.replaceLocation = function (url) {
                url = url.replace(/^\/ghost\//, '/');
                newLocation = url;
            };
            newLocation = undefined;

            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role], slug: 'test-user'});
        });

        afterEach(function () {
            windowProxy.replaceLocation = originalReplaceLocation;
        });

        it('invalidates session on 401 API response', async function () {
            // return a 401 when attempting to retrieve users
            server.get('/users/', () => new Response(401, {}, {
                errors: [
                    {message: 'Access denied.', errorType: 'UnauthorizedError'}
                ]
            }));

            await authenticateSession(application);
            await visit('/team');

            // running `visit(url)` inside windowProxy.replaceLocation breaks
            // the async behaviour so we need to run `visit` here to simulate
            // the browser visiting the new page
            if (newLocation) {
                await visit(newLocation);
            }

            expect(currentURL(), 'url after 401').to.equal('/signin');
        });

        it('doesn\'t show navigation menu on invalid url when not authenticated', async function () {
            invalidateSession(application);

            await visit('/');

            expect(currentURL(), 'current url').to.equal('/signin');
            expect(find('nav.gh-nav').length, 'nav menu presence').to.equal(0);

            await visit('/signin/invalidurl/');

            expect(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
            expect(currentPath(), 'path after invalid url').to.equal('error404');
            expect(find('nav.gh-nav').length, 'nav menu presence').to.equal(0);
        });

        it('shows nav menu on invalid url when authenticated', async function () {
            await authenticateSession(application);
            await visit('/signin/invalidurl/');

            expect(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
            expect(currentPath(), 'path after invalid url').to.equal('error404');
            expect(find('nav.gh-nav').length, 'nav menu presence').to.equal(1);
        });
    });

    // TODO: re-enable once modal reappears correctly
    describe.skip('editor', function () {
        let origDebounce = run.debounce;
        let origThrottle = run.throttle;

        // we don't want the autosave interfering in this test
        beforeEach(function () {
            run.debounce = function () { };
            run.throttle = function () { };
        });

        it('displays re-auth modal attempting to save with invalid session', async function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            // simulate an invalid session when saving the edited post
            server.put('/posts/:id/', function ({posts}, {params}) {
                let post = posts.find(params.id);
                let attrs = this.normalizedRequestAttrs();

                if (attrs.mobiledoc.cards[0][1].markdown === 'Edited post body') {
                    return new Response(401, {}, {
                        errors: [
                            {message: 'Access denied.', errorType: 'UnauthorizedError'}
                        ]
                    });
                } else {
                    return post.update(attrs);
                }
            });

            await authenticateSession(application);

            await visit('/editor');

            // create the post
            await fillIn('#entry-title', 'Test Post');
            await fillIn('.__mobiledoc-editor', 'Test post body');
            await click('.js-publish-button');

            // we shouldn't have a modal at this point
            expect(find('.modal-container #login').length, 'modal exists').to.equal(0);
            // we also shouldn't have any alerts
            expect(find('.gh-alert').length, 'no of alerts').to.equal(0);

            // update the post
            await fillIn('.__mobiledoc-editor', 'Edited post body');
            await click('.js-publish-button');

            // we should see a re-auth modal
            expect(find('.fullscreen-modal #login').length, 'modal exists').to.equal(1);
        });

        // don't clobber debounce/throttle for future tests
        afterEach(function () {
            run.debounce = origDebounce;
            run.throttle = origThrottle;
        });
    });

    it('adds auth headers to jquery ajax', async function (done) {
        let role = server.create('role', {name: 'Administrator'});
        server.create('user', {roles: [role]});

        server.post('/uploads', (schema, request) => request);

        /* eslint-disable camelcase */
        authenticateSession(application, {
            access_token: 'test_token',
            expires_in: 3600,
            token_type: 'Bearer'
        });
        /* eslint-enable camelcase */

        // necessary to visit a page to fully boot the app in testing
        await visit('/');

        /* eslint-disable ghost/ember/jquery-ember-run */
        await $.ajax({
            type: 'POST',
            url: `${Ghost.apiRoot}/uploads/`,
            data: {test: 'Test'}
        }).then((request) => {
            expect(request.requestHeaders.Authorization, 'Authorization header')
                .to.exist;
            expect(request.requestHeaders.Authorization, 'Authotization header content')
                .to.equal('Bearer test_token');
        }).always(() => {
            done();
        });
        /* eslint-enable ghost/ember/jquery-ember-run */
    });
});
