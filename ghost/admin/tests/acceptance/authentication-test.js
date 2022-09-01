import windowProxy from 'ghost-admin/utils/window-proxy';
import {Response} from 'miragejs';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {click, currentRouteName, currentURL, fillIn, findAll, visit} from '@ember/test-helpers';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Authentication', function () {
    let originalReplaceLocation;

    let hooks = setupApplicationTest();
    setupMirage(hooks);

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
            this.server.get('/users/', () => new Response(401, {}, {
                errors: [
                    {message: 'Access denied.', type: 'UnauthorizedError'}
                ]
            }));

            await authenticateSession();
            await visit('/settings/staff');

            // running `visit(url)` inside windowProxy.replaceLocation breaks
            // the async behaviour so we need to run `visit` here to simulate
            // the browser visiting the new page
            if (newLocation) {
                await visit(newLocation);
            }

            expect(currentURL(), 'url after 401').to.equal('/signin');
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
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            // simulate an invalid session when saving the edited post
            this.server.put('/posts/:id/', function ({posts}, {params}) {
                let post = posts.find(params.id);
                let attrs = this.normalizedRequestAttrs();

                if (attrs.mobiledoc.cards[0][1].markdown === 'Edited post body') {
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
            await fillIn('#entry-title', 'Test Post');
            await fillIn('.__mobiledoc-editor', 'Test post body');
            await click('.js-publish-button');

            // we shouldn't have a modal at this point
            expect(findAll('.modal-container #login').length, 'modal exists').to.equal(0);
            // we also shouldn't have any alerts
            expect(findAll('.gh-alert').length, 'no of alerts').to.equal(0);

            // update the post
            await fillIn('.__mobiledoc-editor', 'Edited post body');
            await click('.js-publish-button');

            // we should see a re-auth modal
            expect(findAll('.fullscreen-modal #login').length, 'modal exists').to.equal(1);
        });

        // don't clobber debounce/throttle for future tests
        afterEach(function () {
            run.debounce = origDebounce;
            run.throttle = origThrottle;
        });
    });
});
