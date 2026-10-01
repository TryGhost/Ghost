import * as Sentry from '@sentry/ember';
import sentryTestkit from 'sentry-testkit/browser';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getSentryTestConfig} from 'ghost-admin/utils/sentry';
import {settled, waitUntil} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';

const {sentryTransport, testkit} = sentryTestkit();

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

    describe('Sentry route tag', function () {
        before(function () {
            Sentry.init(getSentryTestConfig(sentryTransport));
        });

        beforeEach(function () {
            Sentry.getCurrentHub().getIsolationScope().clear();
            Sentry.getCurrentScope().clear();
            testkit.reset();
        });

        async function transition() {
            route.send('didTransition');
            await settled();
        }

        async function reportedRoute() {
            const reportCount = testkit.reports().length;
            Sentry.captureMessage('Route tag probe');
            await waitUntil(() => testkit.reports().length > reportCount);
            return testkit.reports().at(-1).tags.route;
        }

        it('tags events raised while parked with the React route pattern', async function () {
            sinon.stub(router, 'currentRouteName').get(() => 'react-fallback');

            stateBridge.setReactRoutePattern('/tags');
            await transition();
            expect(await reportedRoute(), 'after Ember parks').to.equal('/tags');

            stateBridge.setReactRoutePattern('/editor/*');
            expect(await reportedRoute(), 'after a React-only navigation').to.equal('/editor/*');
        });

        it('keeps the Ember route name once React hands the screen back', async function () {
            sinon.stub(router, 'currentRouteName').get(() => 'posts');

            stateBridge.setReactRoutePattern('/tags');
            stateBridge.setReactRoutePattern(null);
            await transition();

            expect(await reportedRoute()).to.equal('posts');
        });
    });
});
