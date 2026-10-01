import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {find, settled, visit} from '@ember/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

// The `billingReact` flag hands /pro and the background billing app to the
// React admin. Ember's side of that handshake: the pro route aborts, the
// billing iframe is never mounted, and force upgrade no longer redirects.

// `visit()` rejects with TransitionAborted whenever the route aborts, which is
// the whole point of the flag being on. Swallow only that rejection.
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

describe('Acceptance: billing React flag', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    function setHostSettings(server, hostSettings) {
        const config = server.db.configs.find(1);
        config.hostSettings = hostSettings;
        server.db.configs.update(1, config);
    }

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');
        setHostSettings(this.server, {billing: {enabled: true, url: 'about:blank'}});

        const role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('when the flag is off', function () {
        it('opens the Ember billing app', async function () {
            await visit('/pro');

            expect(find('#billing-frame'), 'billing iframe').to.exist;
            expect(find('.gh-billing.closed'), 'closed billing modal').to.not.exist;
        });
    });

    describe('when the flag is on', function () {
        beforeEach(function () {
            enableLabsFlag(this.server, 'billingReact');
        });

        it('never mounts the Ember billing app', async function () {
            await visitExpectingAbort('/pro');

            expect(find('#billing-frame'), 'billing iframe').to.not.exist;
        });

        it('parks the router on the React fallback at the billing path', async function () {
            const router = this.owner.lookup('service:router');

            await visitExpectingAbort('/pro/domain');

            expect(router.currentRouteName, 'currentRouteName after aborting').to.equal('react-fallback');
            expect(router.currentRoute?.params?.path, 'fallback path after aborting').to.equal('pro/domain');
        });

        it('navigates React when Ember initiates a billing transition', async function () {
            const route = this.owner.lookup('route:pro');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visit('/tags');
            try {
                await this.owner.lookup('service:router').transitionTo('pro');
            } catch (error) {
                if (error?.name !== 'TransitionAborted') {
                    throw error;
                }
            }
            await settled();

            expect(navigate.calledOnce, '_navigateToReactRoute called once').to.be.true;
            expect(navigate.firstCall.args[0], 'target url').to.equal('/pro');
        });

        it('leaves the force upgrade redirect to React', async function () {
            setHostSettings(this.server, {forceUpgrade: true, billing: {enabled: true, url: 'about:blank'}});
            const router = this.owner.lookup('service:router');

            await visit('/tags');

            expect(router.currentRouteName, 'currentRouteName').to.equal('react-fallback');
            expect(find('#billing-frame'), 'billing iframe').to.not.exist;
        });
    });
});
