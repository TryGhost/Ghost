import Service from '@ember/service';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: tag', function () {
    setupTest();

    afterEach(function () {
        sinon.restore();
    });

    // The router is stubbed per-method on the real instance: wholesale service
    // stubs miss the surface other injected services touch during the route's
    // own instantiation.
    function setupRoute(owner, {flagValue, routeName = 'route:tag'}) {
        const requireAuthentication = sinon.spy();
        class SessionStub extends Service {
            isAuthenticated = true;
            user = {isAuthorOrContributor: false};
            requireAuthentication = requireAuthentication;
        }
        class FeatureStub extends Service {
            tagDetailsReact = flagValue;
        }
        owner.register('service:session', SessionStub);
        owner.register('service:feature', FeatureStub);

        const router = owner.lookup('service:router');
        // `finally` runs its callback synchronously so the URL restoration the
        // real transition promise triggers is exercised, not just stubbed away.
        const settled = {finally(callback) {
            callback();
            return settled;
        }};
        sinon.stub(router, 'replaceWith').returns(settled);

        const route = owner.lookup(routeName);
        const navigate = sinon.stub(route, '_navigateToReactRoute');
        const replaceState = sinon.stub(window.history, 'replaceState');

        return {route, router, navigate, replaceState, requireAuthentication};
    }

    it('aborts the Ember transition when React owns the tag detail route', function () {
        const {route, router, navigate, requireAuthentication} = setupRoute(this.owner, {flagValue: true});
        // A URL intent, so beforeModel does not rewrite the hash itself.
        const transition = {
            abort: sinon.spy(),
            intent: {url: '/tags/my-tag'},
            to: {name: 'tag', params: {tag_slug: 'my-tag'}}
        };

        route.beforeModel(transition);

        expect(requireAuthentication.calledOnce).to.be.true;
        expect(transition.abort.calledOnce, 'transition aborted').to.be.true;
        expect(navigate.called, 'no hash rewrite for a URL intent').to.be.false;
        expect(router.replaceWith.calledWith('react-fallback', 'tags/my-tag'), 'parked on react-fallback').to.be.true;
    });

    // The Cmd-K search modal navigates by route name, so the abort leaves no
    // URL behind for React to render - the click was a silent no-op.
    it('writes the React URL for a named transition', function () {
        const {route, router, navigate} = setupRoute(this.owner, {flagValue: true});
        const transition = {
            abort: sinon.spy(),
            intent: {},
            to: {name: 'tag', params: {tag_slug: 'my-tag'}}
        };

        route.beforeModel(transition);

        expect(navigate.calledOnceWith('/tags/my-tag'), 'hash written').to.be.true;
        expect(router.replaceWith.calledWith('react-fallback', 'tags/my-tag'), 'parked on react-fallback').to.be.true;
    });

    it('writes the create URL for a named transition into tag.new', function () {
        const {route, router, navigate} = setupRoute(this.owner, {flagValue: true, routeName: 'route:tag.new'});
        const transition = {abort: sinon.spy(), intent: {}, to: {name: 'tag.new', params: {}}};

        route.beforeModel(transition);

        expect(navigate.calledOnceWith('/tags/new'), 'hash written').to.be.true;
        expect(router.replaceWith.calledWith('react-fallback', 'tags/new'), 'parked on react-fallback').to.be.true;
    });

    it('restores the URL together with the history state react-router keeps', function () {
        const {route, replaceState} = setupRoute(this.owner, {flagValue: true});
        const state = {usr: null, key: 'abc123', idx: 4};

        route._restoreUrl('#/tags/my-tag', state);

        expect(replaceState.calledOnceWith(state, '', '#/tags/my-tag'), 'state restored with URL').to.be.true;
    });

    it('restores the captured URL after parking', function () {
        const {route, replaceState} = setupRoute(this.owner, {flagValue: true});
        const state = {usr: null, key: 'abc123', idx: 4};
        sinon.stub(window.history, 'state').value(state);
        const transition = {
            abort: sinon.spy(),
            intent: {url: '/tags/my-tag'},
            to: {name: 'tag', params: {tag_slug: 'my-tag'}}
        };

        route.beforeModel(transition);

        expect(replaceState.calledOnceWith(state, '', window.location.hash), 'URL and state restored').to.be.true;
    });

    it('does not park twice on the same fallback path', function () {
        const {route, router} = setupRoute(this.owner, {flagValue: true});
        sinon.stub(router, 'currentRouteName').value('react-fallback');
        sinon.stub(router, 'currentRoute').value({params: {path: 'tags/my-tag'}});

        route._parkOnReactFallback('/tags/my-tag');

        expect(router.replaceWith.called, 'no re-parking').to.be.false;
    });

    it('keeps Ember ownership when the feature flag is not a boolean', function () {
        const {route, router, navigate} = setupRoute(this.owner, {flagValue: 'true'});
        const transition = {abort: sinon.spy(), intent: {}, to: {name: 'tag', params: {tag_slug: 'my-tag'}}};

        route.beforeModel(transition);

        expect(transition.abort.called, 'transition not aborted').to.be.false;
        expect(navigate.called, 'no hash rewrite').to.be.false;
        expect(router.replaceWith.called, 'no parking').to.be.false;
    });
});
