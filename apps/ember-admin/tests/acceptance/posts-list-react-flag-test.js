import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {find, settled, visit} from '@ember/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

// The `postsListReact` flag hands /posts and /pages to the React app. Ember's
// side of that handshake is PostsRoute#beforeModel: it aborts so the Ember
// subtree stays unrendered, and drives window.location.hash so navigations
// Ember itself starts still land somewhere (an aborted transition never
// reaches updateURL, and the two apps share the hash).

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

describe('Acceptance: posts/pages React flag', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');

        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('when the flag is off', function () {
        it('renders the Ember posts list', async function () {
            this.server.createList('post', 2);

            await visit('/posts');

            expect(find('[data-testid="posts-list"]'), 'Ember posts list').to.exist;
        });

        it('renders the Ember pages list', async function () {
            this.server.createList('page', 2);

            await visit('/pages');

            expect(find('[data-testid="posts-list"]'), 'Ember pages list').to.exist;
        });
    });

    describe('when the flag is on', function () {
        beforeEach(function () {
            enableLabsFlag(this.server, 'postsListReact');
        });

        it('does not render the Ember posts list', async function () {
            this.server.createList('post', 2);

            await visitExpectingAbort('/posts');

            expect(find('[data-testid="posts-list"]'), 'Ember posts list').to.not.exist;
            expect(find('[data-testid="posts-filters"]'), 'Ember posts filters').to.not.exist;
        });

        it('does not render the Ember pages list', async function () {
            this.server.createList('page', 2);

            await visitExpectingAbort('/pages');

            expect(find('[data-testid="posts-list"]'), 'Ember pages list').to.not.exist;
        });

        it('does not fetch posts for a screen it will not render', async function () {
            this.server.createList('post', 2);

            let postRequests = 0;
            this.server.pretender.handledRequest = (verb, path) => {
                if (verb === 'GET' && path === '/ghost/api/admin/posts/') {
                    postRequests += 1;
                }
            };

            await visitExpectingAbort('/posts');

            expect(postRequests, 'GET /posts/ requests').to.equal(0);
        });

        // The regression this guards: transitionTo('posts') from the publish
        // flow, and the <LinkTo @route="posts"> breadcrumbs on the debug and
        // member screens, all abort. Without supplying a URL they are silent
        // no-ops and the user is stranded on the previous screen.
        it('navigates React when Ember initiates a transition into posts', async function () {
            const route = this.owner.lookup('route:posts');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/tags');
            this.owner.lookup('service:router').transitionTo('posts');
            await settled();

            expect(navigate.calledOnce, '_navigateToReactRoute called once').to.be.true;
            expect(navigate.firstCall.args[0], 'target url').to.equal('/posts');
        });

        it('carries query params through an Ember-initiated transition', async function () {
            const route = this.owner.lookup('route:posts');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/tags');
            this.owner.lookup('service:router').transitionTo('posts', {queryParams: {type: 'draft'}});
            await settled();

            expect(navigate.firstCall.args[0], 'target url').to.equal('/posts?type=draft');
        });

        it('navigates React when Ember initiates a transition into pages', async function () {
            const route = this.owner.lookup('route:pages');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/tags');
            this.owner.lookup('service:router').transitionTo('pages');
            await settled();

            expect(navigate.calledOnce, '_navigateToReactRoute called once').to.be.true;
            expect(navigate.firstCall.args[0], 'target url').to.equal('/pages');
        });

        // Aborting means the route we came FROM never deactivates, so any UI
        // state its teardown would have cleared stays set. The editor's
        // teardown is the one that shows: it clears full-screen mode, which is
        // what the React shell reads to decide whether to show the sidebar.
        // Without this, returning from the editor leaves you with no sidebar.
        it('leaves full-screen mode when it aborts', async function () {
            const ui = this.owner.lookup('service:ui');
            ui.set('isFullScreen', true);

            await visitExpectingAbort('/posts');

            expect(ui.isFullScreen, 'isFullScreen after aborting into posts').to.be.false;
        });

        it('leaves full-screen mode when it aborts into pages', async function () {
            const ui = this.owner.lookup('service:ui');
            ui.set('isFullScreen', true);

            await visitExpectingAbort('/pages');

            expect(ui.isFullScreen, 'isFullScreen after aborting into pages').to.be.false;
        });

        // Query params are how saved views are addressed, so a URL that already
        // points at this route must be left exactly as it is.
        it('does not rewrite a URL-initiated navigation', async function () {
            const route = this.owner.lookup('route:posts');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visitExpectingAbort('/posts?type=draft');

            expect(navigate.called, '_navigateToReactRoute called').to.be.false;
        });

        // Regression: aborting alone left the router still reporting the route
        // it came from, so returning to that same URL later was a no-op
        // transition that rendered nothing - the editor came back blank. Parking
        // on the catch-all keeps the router's own state truthful.
        it('parks the router on the React fallback route', async function () {
            const router = this.owner.lookup('service:router');

            await visitExpectingAbort('/posts');

            expect(router.currentRouteName, 'currentRouteName after aborting').to.equal('react-fallback');
        });

        // ...and parks with `replaceWith`, not `transitionTo`: this corrects
        // router state the user never asked to change, so it must not put an
        // extra entry in their way when they press Back.
        //
        // Only the positive assertion is made. `transitionTo` cannot serve as a
        // negative signal here, because Ember's own `replaceWith` is built on
        // top of it - spying on it reports a call either way.
        it('parks with replace semantics so no history entry is added', async function () {
            const route = this.owner.lookup('route:posts');
            const replaceWith = sinon.spy(route.router, 'replaceWith');

            await visitExpectingAbort('/posts');

            expect(replaceWith.calledWith('react-fallback', 'posts'), 'replaceWith called').to.be.true;
        });

        // Regression: the guard used to match on the route name alone, so once
        // parked anywhere the router never moved again. Arriving from
        // /analytics — which the admin boots on — left it pinned there, and the
        // editor reads that path to label its back button, offering "Analytics"
        // for a post opened from the list.
        it('re-parks when already parked at a different path', async function () {
            const router = this.owner.lookup('service:router');

            await visitExpectingAbort('/analytics');
            expect(router.currentRoute?.params?.path, 'parked path after /analytics').to.equal('analytics');

            await visitExpectingAbort('/posts');

            expect(router.currentRouteName, 'currentRouteName after /posts').to.equal('react-fallback');
            expect(router.currentRoute?.params?.path, 'parked path after /posts').to.equal('posts');
        });
    });
});
