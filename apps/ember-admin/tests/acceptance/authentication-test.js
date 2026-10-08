import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {Response} from 'miragejs';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {expect} from 'chai';
import {fillIn, findAll, settled, triggerKeyEvent, waitFor} from '@ember/test-helpers';
import {run} from '@ember/runloop';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Authentication', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
    });

    describe('general page', function () {
        beforeEach(function () {
            sinon.stub(windowProxy, 'replaceLocation');
            sinon.stub(windowProxy, 'changeLocation');

            const role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role], slug: 'test-user'});
        });

        afterEach(function () {
            sinon.restore();
        });

        // The editor is the only Ember route left that loads API data, and it
        // handles authorization failures itself, so the request is made
        // directly once the app has loaded. Its rejection is caught here so it
        // doesn't reach global.onerror.
        it('replaces location with root URL on 403 API response whilst "authenticated"', async function () {
            this.server.get('/tags/', () => new Response(403, {}, {
                errors: [
                    {message: 'Authorization failed', type: 'NoPermissionError'}
                ]
            }));

            await authenticateSession();
            await visit('/restore');

            await this.owner.lookup('service:store').query('tag', {limit: 1}).catch(() => {});
            await settled();

            expect(windowProxy.replaceLocation.calledWith('/ghost/'), 'replaceLocation called with /ghost/').to.be.true;
        });
    });

    describe('editor', function () {
        const origDebounce = run.debounce;
        const origThrottle = run.throttle;

        // we don't want the autosave interfering in this test
        beforeEach(function () {
            run.debounce = function () { };
            run.throttle = function () { };
        });

        it('displays re-auth modal attempting to save with invalid session', async function () {
            const role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});
            let testOn = 'save'; // use marker for different type of server.put result

            // simulate an invalid session when saving the edited post
            this.server.put('/posts/:id/', function ({posts, db}, {params}) {
                const post = posts.find(params.id);
                const attrs = db.posts.find(params.id); // use attribute from db.posts to avoid hasInverseFor error

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
