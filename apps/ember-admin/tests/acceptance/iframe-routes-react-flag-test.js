import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {currentURL, find, settled} from '@ember/test-helpers';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

// The `iframeRoutesReact` flag hands /site and /migrate/* to the React app.
// Ember's side of that handshake is each route's beforeModel: it aborts so
// the Ember screen stays unrendered and parks the router on react-fallback.
describe('Acceptance: iframe routes React flag', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');
    });

    afterEach(function () {
        sinon.restore();
    });

    async function signInAs(server, roleName) {
        const role = server.create('role', {name: roleName});
        server.create('user', {roles: [role]});
        await authenticateSession();
    }

    describe('when the flag is off', function () {
        it('renders the Ember site preview', async function () {
            await signInAs(this.server, 'Administrator');

            await visit('/site');

            expect(find('[data-view-site-preview]'), 'site preview iframe').to.exist;
        });
    });

    describe('when the flag is on', function () {
        beforeEach(function () {
            enableLabsFlag(this.server, 'iframeRoutesReact');
        });

        it('parks /site on the React fallback without rendering Ember', async function () {
            await signInAs(this.server, 'Administrator');
            const router = this.owner.lookup('service:router');

            await visit('/site');

            expect(find('[data-view-site-preview]'), 'site preview iframe').to.not.exist;
            expect(router.currentRouteName).to.equal('react-fallback');
            expect(router.currentRoute?.params?.path).to.equal('site');
        });

        it('parks /migrate/* on the React fallback at the platform path', async function () {
            await signInAs(this.server, 'Administrator');
            const router = this.owner.lookup('service:router');

            await visit('/migrate/substack');

            expect(find('#migrate-frame'), 'migrate iframe').to.not.exist;
            expect(router.currentRouteName).to.equal('react-fallback');
            expect(router.currentRoute?.params?.path).to.equal('migrate/substack');
        });

        it('navigates React when Ember initiates a site transition', async function () {
            await signInAs(this.server, 'Administrator');
            const route = this.owner.lookup('route:site');
            const navigate = sinon.stub(route, '_navigateToReactRoute');

            await visit('/tags');
            try {
                await this.owner.lookup('service:router').transitionTo('site');
            } catch (error) {
                if (error?.message !== 'TransitionAborted') {
                    throw error;
                }
            }
            await settled();

            expect(navigate.calledOnceWith('/site')).to.be.true;
        });

        it('keeps staff without admin access out of /migrate', async function () {
            await signInAs(this.server, 'Editor');

            await visit('/migrate/substack');

            expect(currentURL()).to.equal('/');
        });
    });
});
