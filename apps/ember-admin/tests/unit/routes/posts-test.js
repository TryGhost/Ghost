import Service from '@ember/service';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: posts', function () {
    setupTest();

    afterEach(function () {
        sinon.restore();
    });

    // The router and ui services are stubbed per-method on the real instances:
    // wholesale service stubs miss the surface other injected services touch
    // during the route's own instantiation.
    function setupRoute(owner, {flagValue}) {
        class SessionStub extends Service {
            isAuthenticated = true;
            user = {isAuthorOrContributor: false};
            requireAuthentication = sinon.spy();
        }
        class FeatureStub extends Service {
            postsListReact = flagValue;
        }
        owner.register('service:session', SessionStub);
        owner.register('service:feature', FeatureStub);

        const router = owner.lookup('service:router');
        sinon.stub(router, 'on');
        sinon.stub(router, 'replaceWith').returns({finally: sinon.stub()});

        const route = owner.lookup('route:posts');
        // Set by the router when it mounts the route; a bare unit lookup has
        // no router, so pin the name the parking call passes along.
        route.routeName = 'posts';
        const ui = owner.lookup('service:ui');
        sinon.spy(ui, 'set');

        return {route, router, ui};
    }

    it('aborts the Ember transition when React owns the posts list', function () {
        const {route, router, ui} = setupRoute(this.owner, {flagValue: true});
        // A URL intent, so beforeModel does not rewrite the hash itself.
        const transition = {abort: sinon.spy(), intent: {url: '/posts'}};

        route.beforeModel(transition);

        expect(transition.abort.calledOnce, 'transition aborted').to.be.true;
        expect(ui.set.calledWith('isFullScreen', false), 'full-screen reset').to.be.true;
        expect(router.replaceWith.calledWith('react-fallback', 'posts'), 'parked on react-fallback').to.be.true;
    });

    it('keeps Ember ownership when the feature flag is not a boolean', function () {
        const {route, router} = setupRoute(this.owner, {flagValue: 'true'});
        const transition = {abort: sinon.spy(), intent: {url: '/posts'}};

        route.beforeModel(transition);

        expect(transition.abort.called, 'transition not aborted').to.be.false;
        expect(router.replaceWith.called, 'no parking').to.be.false;
    });
});
