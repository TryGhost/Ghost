import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Route: application', function () {
    setupTest();

    let route, modals, router, stateBridge;

    beforeEach(function () {
        sinon.stub(this.owner.lookup('service:feature'), 'globalSearchReact').get(() => false);
        modals = this.owner.lookup('service:modals');
        sinon.stub(modals, 'open');
        router = this.owner.lookup('service:router');
        sinon.stub(router, 'transitionTo');
        stateBridge = this.owner.lookup('service:state-bridge');
        route = this.owner.lookup('route:application');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('ignores the search and settings shortcuts while a React route hides the sidebar', function () {
        stateBridge.setReactFullScreen(true);

        route.send('openSearchModal');
        route.send('openSettings');

        expect(modals.open.called, 'search modal opened').to.be.false;
        expect(router.transitionTo.called, 'settings opened').to.be.false;
    });

    it('handles the search and settings shortcuts once React shows the sidebar again', function () {
        stateBridge.setReactFullScreen(true);
        stateBridge.setReactFullScreen(false);

        route.send('openSearchModal');
        route.send('openSettings');

        expect(modals.open.calledOnce, 'search modal opened').to.be.true;
        expect(router.transitionTo.calledOnceWithExactly('/settings'), 'settings opened').to.be.true;
    });
});
