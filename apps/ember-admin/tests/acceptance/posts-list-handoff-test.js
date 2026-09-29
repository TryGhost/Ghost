import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, find, settled, visit} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

// React owns /posts and /pages. Ember's side of that handshake is
// PostsRoute#beforeModel: it aborts so nothing renders in Ember, and drives
// window.location.hash so navigations Ember itself starts still land
// somewhere (an aborted transition never reaches updateURL, and the two apps
// share the hash).

// `visit()` rejects with TransitionAborted whenever the route aborts, which is
// what every visit to these routes does. Swallow only that rejection so the
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

describe('Acceptance: posts/pages hand-off to React', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    let user;

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');

        const role = this.server.create('role', {name: 'Administrator'});
        user = this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    afterEach(function () {
        sinon.restore();
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
    // flow, and the editor's <LinkTo @route="posts"> back link, all abort.
    // Without supplying a URL they are silent no-ops and the user is stranded
    // on the previous screen.
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

    // The query params the editor's back link passes are declared on the
    // route, with no posts controller behind them. The link must still carry
    // the list's filters through to React.
    it('carries the list filters through the editor back link', async function () {
        const post = this.server.create('post', {authors: [user]});
        this.owner.lookup('service:state-bridge').setPostListQueryParams('posts', {type: 'draft', tag: 'news'});
        const route = this.owner.lookup('route:posts');
        const navigate = sinon.stub(route, '_navigateToReactRoute');

        await visit(`/editor/post/${post.id}`);

        expect(find('[data-test-breadcrumb]').getAttribute('href'), 'back link href').to.contain('type=draft');

        await click('[data-test-breadcrumb]');

        expect(navigate.calledOnceWith('/posts?type=draft&tag=news'), `navigated to ${navigate.firstCall?.args[0]}`).to.be.true;
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

    for (const resource of ['posts', 'pages']) {
        it(`never drops query params while handing ${resource} to React`, async function () {
            await visitExpectingAbort('/analytics');
            const location = this.owner.lookup('location:none');
            const setURL = sinon.spy(location, 'setURL');
            const replaceURL = location.replaceURL ? sinon.spy(location, 'replaceURL') : null;

            await visitExpectingAbort(`/${resource}?tag=blog&order=published_at%20asc`);

            const finalQuery = new URL(location.getURL(), 'http://localhost').searchParams;
            expect(finalQuery.get('tag'), 'filter retained in final URL').to.equal('blog');
            expect(finalQuery.get('order'), 'sort retained in final URL').to.equal('published_at asc');
            const writes = [...setURL.getCalls(), ...(replaceURL?.getCalls() ?? [])];
            for (const call of writes) {
                const query = new URL(call.args[0], 'http://localhost').searchParams;
                expect(query.get('tag'), `tag in URL write: ${call.args[0]}`).to.equal('blog');
                expect(query.get('order'), `sort in URL write: ${call.args[0]}`).to.equal('published_at asc');
            }
            const router = this.owner.lookup('service:router');
            expect(router.currentRouteName).to.equal('react-fallback');
            expect(router.currentRoute.params.path).to.equal(resource);
        });
    }

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
