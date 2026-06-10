import {authenticateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {currentRouteName, currentURL} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Dashboard', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        mockAnalyticsApps();
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    describe('redirects', function () {
        it('hands over to the React shell (which redirects to Analytics)', async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
            await visit('/dashboard');

            // The React admin owns /dashboard (pure redirect to /analytics);
            // the Ember route parks on the react-fallback catch-all.
            expect(currentURL()).to.equal('/dashboard');
            expect(currentRouteName()).to.equal('react-fallback');
        });
    });
});
