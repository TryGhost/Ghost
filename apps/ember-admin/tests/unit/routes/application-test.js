/* global key */
import * as Sentry from '@sentry/ember';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import sentryTestkit from 'sentry-testkit/browser';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getSentryTestConfig} from '../../helpers/sentry';
import {settled, triggerKeyEvent, waitUntil} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';

const {sentryTransport, testkit} = sentryTestkit();

describe('Unit: Route: application', function () {
    setupTest();

    let route, router, stateBridge;

    beforeEach(function () {
        router = this.owner.lookup('service:router');
        sinon.stub(router, 'transitionTo');
        stateBridge = this.owner.lookup('service:state-bridge');
        route = this.owner.lookup('route:application');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('ignores the settings shortcut while a React route hides the sidebar', function () {
        stateBridge.setReactFullScreen(true);

        route.send('openSettings');

        expect(router.transitionTo.called, 'settings opened').to.be.false;
    });

    it('handles the settings shortcut once React shows the sidebar again', function () {
        stateBridge.setReactFullScreen(true);
        stateBridge.setReactFullScreen(false);

        route.send('openSettings');

        expect(router.transitionTo.calledOnceWithExactly('/settings'), 'settings opened').to.be.true;
    });

    describe('app-wide shortcuts', function () {
        const modifiers = {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'};
        let previousKeyScope;

        beforeEach(function () {
            // keymaster's scope is global, and a token input removed while focused
            // never blurs back to the 'default' scope the settings shortcut needs
            previousKeyScope = key.getScope();
            key.setScope('default');
            sinon.stub(route, 'send');
            route.registerShortcuts();
        });

        afterEach(function () {
            route.removeShortcuts();
            key.setScope(previousKeyScope);
        });

        it('handles save and settings while an Ember route shows', async function () {
            stateBridge.setReactRoutePattern(null);

            await triggerKeyEvent(document.body, 'keydown', 83, modifiers);
            await triggerKeyEvent(document.body, 'keydown', 188, modifiers);

            expect(route.send.args.map(([action]) => action)).to.deep.equal(['save', 'openSettings']);
        });

        it('leaves save and settings to React while a React route shows', async function () {
            stateBridge.setReactRoutePattern('/tags');

            await triggerKeyEvent(document.body, 'keydown', 83, modifiers);
            await triggerKeyEvent(document.body, 'keydown', 188, modifiers);

            expect(route.send.called, 'shortcut action sent').to.be.false;
        });
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
