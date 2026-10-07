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
    function setupRoute(owner) {
        class SessionStub extends Service {
            isAuthenticated = true;
            user = {isAuthorOrContributor: false};
            requireAuthentication = sinon.spy();
        }
        owner.register('service:session', SessionStub);

        const router = owner.lookup('service:router');
        sinon.stub(router, 'replaceWith').returns({method: sinon.stub()});

        const route = owner.lookup('route:posts');
        // Set by the router when it mounts the route; a bare unit lookup has
        // no router, so pin the name the parking call passes along.
        route.routeName = 'posts';
        const ui = owner.lookup('service:ui');
        sinon.spy(ui, 'set');

        return {route, router, ui};
    }

    it('aborts the Ember transition and hands the posts list to React', function () {
        const {route, router, ui} = setupRoute(this.owner);
        // A URL intent, so beforeModel does not rewrite the hash itself.
        const transition = {abort: sinon.spy(), intent: {url: '/posts'}};

        route.beforeModel(transition);

        expect(transition.abort.calledOnce, 'transition aborted').to.be.true;
        expect(ui.set.calledWith('isFullScreen', false), 'full-screen reset').to.be.true;
        expect(router.replaceWith.calledWith('react-fallback', 'posts'), 'parked on react-fallback').to.be.true;
    });

    it('parks without writing the URL or React Router history state', function () {
        const {route, router} = setupRoute(this.owner);
        const replaceState = sinon.stub(window.history, 'replaceState');

        route.beforeModel({abort: sinon.spy(), intent: {url: '/posts?type=draft'}});

        expect(router.replaceWith.firstCall.returnValue.method.calledOnceWithExactly(null), 'URL updates disabled').to.be.true;
        expect(replaceState.called, 'history state untouched').to.be.false;
    });

    it('writes the React URL for a named transition', function () {
        const {route} = setupRoute(this.owner);
        const navigate = sinon.stub(route, '_navigateToReactRoute');

        route.beforeModel({
            abort: sinon.spy(),
            intent: {name: 'posts'},
            to: {queryParams: {type: 'draft', tag: null}}
        });

        expect(navigate.calledOnceWithExactly('/posts?type=draft'), 'navigated to React').to.be.true;
    });

    it('restores list state after the editor breadcrumb writes its destination', function () {
        const {route} = setupRoute(this.owner);
        const navigate = sinon.stub(route, '_navigateToReactRoute');
        const trigger = sinon.stub(this.owner.lookup('service:state-bridge'), 'trigger');

        route.beforeModel({
            abort: sinon.spy(),
            from: {name: 'lexical-editor.edit'},
            to: {queryParams: {tag: 'news', order: 'title asc'}}
        });

        expect(navigate.calledOnceWithExactly('/posts?tag=news&order=title%20asc')).to.be.true;
        const restoreCalls = trigger.getCalls().filter(call => call.args[0] === 'restoreListState');
        expect(restoreCalls).to.have.length(1);
        expect(restoreCalls[0].args).to.deep.equal(['restoreListState', {path: '/posts?tag=news&order=title%20asc'}]);
        expect(restoreCalls[0].calledAfter(navigate.firstCall)).to.be.true;
    });
});
