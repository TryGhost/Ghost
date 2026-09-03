import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {find, settled, visit} from '@ember/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

// The `tagDetailsReact` flag hands /tags/:slug to the React app. Ember's side
// of that handshake is the tag route's beforeModel: it aborts so the Ember tag
// editor stays unrendered, and drives window.location.hash so navigations
// Ember itself starts (the Cmd-K search modal) still land somewhere — an
// aborted transition never reaches updateURL, and the two apps share the hash.

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

describe('Acceptance: tag React flag', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');

        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {roles: [role]});
        this.server.create('tag', {name: 'My tag', slug: 'my-tag'});

        return await authenticateSession();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('when the flag is off', function () {
        it('renders the Ember tag editor', async function () {
            await visit('/tags/my-tag');

            expect(find('[data-test-screen-title]'), 'Ember tag editor title').to.exist;
        });
    });

    describe('when the flag is on', function () {
        beforeEach(function () {
            enableLabsFlag(this.server, 'tagDetailsReact');
        });

        it('does not render the Ember tag editor', async function () {
            await visitExpectingAbort('/tags/my-tag');

            expect(find('[data-test-screen-title]'), 'Ember tag editor title').to.not.exist;
        });

        // The regression this guards: the Cmd-K search modal transitions by
        // route name. Without supplying a URL the click is a silent no-op and
        // the user is stranded on the previous screen.
        it('navigates React when Ember initiates a tag transition', async function () {
            const route = this.owner.lookup('route:tag');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/posts');
            this.owner.lookup('service:router').transitionTo('tag', 'my-tag');
            await settled();

            expect(navigate.calledOnce, '_navigateToReactRoute called once').to.be.true;
            expect(navigate.firstCall.args[0], 'target url').to.equal('/tags/my-tag');
        });

        it('navigates React when Ember initiates a new-tag transition', async function () {
            const route = this.owner.lookup('route:tag.new');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/posts');
            this.owner.lookup('service:router').transitionTo('tag.new');
            await settled();

            expect(navigate.calledOnce, '_navigateToReactRoute called once').to.be.true;
            expect(navigate.firstCall.args[0], 'target url').to.equal('/tags/new');
        });

        // A URL that already points at the tag must be left exactly as it is —
        // React is already rendering it.
        it('does not rewrite a URL-initiated navigation', async function () {
            const route = this.owner.lookup('route:tag');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/tags/my-tag');

            expect(navigate.called, '_navigateToReactRoute called').to.be.false;
        });

        // Aborting alone leaves the router still reporting the route it came
        // from, so returning to that same URL later would be a no-op
        // transition that renders nothing. Parking on the catch-all at the
        // actual tag path keeps both routers truthful.
        it('parks the router on the React fallback at the tag path', async function () {
            const router = this.owner.lookup('service:router');

            await visitExpectingAbort('/tags/my-tag');

            expect(router.currentRouteName, 'currentRouteName after aborting').to.equal('react-fallback');
            expect(router.currentRoute?.params?.path, 'fallback path after aborting').to.equal('tags/my-tag');
        });
    });
});
