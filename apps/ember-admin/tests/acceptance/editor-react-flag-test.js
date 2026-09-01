import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {find, settled, visit} from '@ember/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {titleSelector} from '../helpers/editor';

// The `editorReact` flag hands /editor/* to the React app. Ember's side of
// that handshake is the lexical-editor route's beforeModel: it aborts so the
// Ember editor stays unrendered, and drives window.location.hash so
// navigations Ember itself starts (post list title links, Cmd-K search, the
// post-success modal) still land somewhere — an aborted transition never
// reaches updateURL, and the two apps share the hash.

// `visit()` rejects with TransitionAborted whenever the route aborts, which is
// the whole point of the flag being on. Swallow only that rejection so the
// assertions below can run; anything else still fails the test.
async function visitExpectingAbort(url) {
    try {
        await visit(url);
    } catch (error) {
        if (error?.message !== 'TransitionAborted' && error?.name !== 'TransitionAborted') {
            throw error;
        }
    }
    await settled();
}

describe('Acceptance: editor React flag', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');

        let role = this.server.create('role', {name: 'Administrator'});
        let user = this.server.create('user', {roles: [role]});
        this.server.create('post', {authors: [user]});

        return await authenticateSession();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('when the flag is off', function () {
        it('renders the Ember editor', async function () {
            await visit('/editor/post/1');

            expect(find(titleSelector), 'Ember editor title input').to.exist;
        });
    });

    describe('when the flag is on', function () {
        beforeEach(function () {
            enableLabsFlag(this.server, 'editorReact');
        });

        it('does not render the Ember editor', async function () {
            await visitExpectingAbort('/editor/post/1');

            expect(find(titleSelector), 'Ember editor title input').to.not.exist;
        });

        it('does not render the Ember editor for a new post', async function () {
            await visitExpectingAbort('/editor/post');

            expect(find(titleSelector), 'Ember editor title input').to.not.exist;
        });

        // The regression this guards: post list title links, Cmd-K search
        // results, and the post-success modal's revert-to-draft all
        // transition by route name. Without supplying a URL they are silent
        // no-ops and the user is stranded on the previous screen.
        it('navigates React when Ember initiates an edit transition', async function () {
            const route = this.owner.lookup('route:lexical-editor');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/tags');
            this.owner.lookup('service:router').transitionTo('lexical-editor.edit', 'post', '1');
            await settled();

            expect(navigate.calledOnce, '_navigateToReactRoute called once').to.be.true;
            expect(navigate.firstCall.args[0], 'target url').to.equal('/editor/post/1');
        });

        it('navigates React when Ember initiates a new-post transition', async function () {
            const route = this.owner.lookup('route:lexical-editor');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/tags');
            this.owner.lookup('service:router').transitionTo('lexical-editor.new', 'post');
            await settled();

            expect(navigate.calledOnce, '_navigateToReactRoute called once').to.be.true;
            expect(navigate.firstCall.args[0], 'target url').to.equal('/editor/post');
        });

        // A URL that already points at the editor must be left exactly as it
        // is — React is already rendering it.
        it('does not rewrite a URL-initiated navigation', async function () {
            const route = this.owner.lookup('route:lexical-editor');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/editor/post/1');

            expect(navigate.called, '_navigateToReactRoute called').to.be.false;
        });

        // Aborting alone leaves the router still reporting the route it came
        // from, so returning to that same URL later would be a no-op
        // transition that renders nothing. Parking on the catch-all keeps the
        // router's own state truthful.
        it('parks the router on the React fallback route', async function () {
            const router = this.owner.lookup('service:router');

            await visitExpectingAbort('/editor/post/1');

            expect(router.currentRouteName, 'currentRouteName after aborting').to.equal('react-fallback');
        });
    });
});
