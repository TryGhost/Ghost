/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import {expect} from 'chai';
import $ from 'jquery';
import run from 'ember-runloop';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {Response} from 'ember-cli-mirage';
import windowProxy from 'ghost-admin/utils/window-proxy';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import OAuth2Authenticator from 'ghost-admin/authenticators/oauth2';

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
            server.get('authentication/setup', function () {
                return {setup: [{status: false}]};
            });
        });

        it('redirects to setup when setup isn\'t complete', function () {
            visit('settings/labs');

            andThen(() => {
                expect(currentURL()).to.equal('/setup/one');
            });
        });
    });

    describe('token handling', function () {
        beforeEach(function () {
            // replace the default test authenticator with our own authenticator
            application.register('authenticator:test', OAuth2Authenticator);

            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role], slug: 'test-user'});
        });

        it('refreshes app tokens on boot', function () {
            /* eslint-disable camelcase */
            authenticateSession(application, {
                access_token: 'testAccessToken',
                refresh_token: 'refreshAccessToken'
            });
            /* eslint-enable camelcase */

            visit('/');

            andThen(() => {
                let requests = server.pretender.handledRequests;
                let refreshRequest = requests.findBy('url', '/ghost/api/v0.1/authentication/token');

                expect(refreshRequest).to.exist;
                expect(refreshRequest.method, 'method').to.equal('POST');

                let requestBody = $.deparam(refreshRequest.requestBody);
                expect(requestBody.grant_type, 'grant_type').to.equal('password');
                expect(requestBody.username.access_token, 'access_token').to.equal('testAccessToken');
                expect(requestBody.username.refresh_token, 'refresh_token').to.equal('refreshAccessToken');

            });
        });
    });

    describe('general page', function () {
        beforeEach(function () {
            originalReplaceLocation = windowProxy.replaceLocation;
            windowProxy.replaceLocation = function (url) {
                url = url.replace(/^\/ghost\//, '/');
                visit(url);
            };

            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role], slug: 'test-user'});
        });

        afterEach(function () {
            windowProxy.replaceLocation = originalReplaceLocation;
        });

        it('invalidates session on 401 API response', function () {
            // return a 401 when attempting to retrieve users
            server.get('/users/', () => {
                return new Response(401, {}, {
                    errors: [
                        {message: 'Access denied.', errorType: 'UnauthorizedError'}
                    ]
                });
            });

            authenticateSession(application);
            visit('/team');

            andThen(() => {
                // NOTE: seems to be a test issue where this is running
                // mid transition
            });

            andThen(() => {
                expect(currentURL(), 'url after 401').to.equal('/signin');
            });
        });

        it('doesn\'t show navigation menu on invalid url when not authenticated', function () {
            invalidateSession(application);

            visit('/');

            andThen(() => {
                expect(currentURL(), 'current url').to.equal('/signin');
                expect(find('nav.gh-nav').length, 'nav menu presence').to.equal(0);
            });

            visit('/signin/invalidurl/');

            andThen(() => {
                expect(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
                expect(currentPath(), 'path after invalid url').to.equal('error404');
                expect(find('nav.gh-nav').length, 'nav menu presence').to.equal(0);
            });
        });

        it('shows nav menu on invalid url when authenticated', function () {
            authenticateSession(application);
            visit('/signin/invalidurl/');

            andThen(() => {
                expect(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
                expect(currentPath(), 'path after invalid url').to.equal('error404');
                expect(find('nav.gh-nav').length, 'nav menu presence').to.equal(1);
            });
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

        it('displays re-auth modal attempting to save with invalid session', function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            // simulate an invalid session when saving the edited post
            server.put('/posts/:id/', function ({posts}, {params}) {
                let post = posts.find(params.id);
                let attrs = this.normalizedRequestAttrs();

                if (attrs.markdown === 'Edited post body') {
                    return new Response(401, {}, {
                        errors: [
                            {message: 'Access denied.', errorType: 'UnauthorizedError'}
                        ]
                    });
                } else {
                    return post.update(attrs);
                }
            });

            authenticateSession(application);

            visit('/editor');

            // create the post
            fillIn('#entry-title', 'Test Post');
            fillIn('.__mobiledoc-editor', 'Test post body');
            click('.js-publish-button');

            andThen(() => {
                // we shouldn't have a modal at this point
                expect(find('.modal-container #login').length, 'modal exists').to.equal(0);
                // we also shouldn't have any alerts
                expect(find('.gh-alert').length, 'no of alerts').to.equal(0);
            });

            // update the post
            fillIn('.__mobiledoc-editor', 'Edited post body');
            click('.js-publish-button');

            andThen(() => {
                // we should see a re-auth modal
                expect(find('.fullscreen-modal #login').length, 'modal exists').to.equal(1);
            });
        });

        // don't clobber debounce/throttle for future tests
        afterEach(function () {
            run.debounce = origDebounce;
            run.throttle = origThrottle;
        });
    });

    it('adds auth headers to jquery ajax', function (done) {
        let role = server.create('role', {name: 'Administrator'});
        server.create('user', {roles: [role]});

        server.post('/uploads', (schema, request) => {
            return request;
        });

        /* eslint-disable camelcase */
        authenticateSession(application, {
            access_token: 'test_token',
            expires_in: 3600,
            token_type: 'Bearer'
        });
        /* eslint-enable camelcase */

        // necessary to visit a page to fully boot the app in testing
        visit('/').andThen(() => {
            $.ajax({
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
        });
    });
});
