import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {currentURL, visit, waitUntil} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableMembers} from '../helpers/members';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Onboarding', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    async function visitSetupDoneRedirect() {
        try {
            await visit('/setup/done');
        } catch (error) {
            if (error?.message !== 'TransitionAborted') {
                throw error;
            }
        }
    }

    beforeEach(async function () {
        mockAnalyticsApps();

        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');
        this.server.loadFixtures('themes');

        enableMembers(this.server);
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    describe('setup handoff (owner)', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role], slug: 'owner'});
            await authenticateSession();
        });

        it('setup/done starts onboarding and redirects to the React onboarding route', async function () {
            await visitSetupDoneRedirect();

            await waitUntil(() => window.location.hash === '#/setup/onboarding?returnTo=/analytics');
            expect(window.location.hash).to.equal('#/setup/onboarding?returnTo=/analytics');

            let user = this.server.schema.users.first();
            let preferences = JSON.parse(user.accessibility);
            expect(preferences.onboarding.completedSteps).to.deep.equal([]);
            expect(preferences.onboarding.checklistState).to.equal('started');
            expect(preferences.onboarding.startedAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('setup handoff (non-owner)', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role], slug: 'admin'});
            await authenticateSession();
        });

        it('setup/done redirects to the React onboarding route without starting onboarding', async function () {
            await visitSetupDoneRedirect();

            await waitUntil(() => window.location.hash === '#/setup/onboarding?returnTo=/analytics');
            expect(window.location.hash).to.equal('#/setup/onboarding?returnTo=/analytics');

            let user = this.server.schema.users.first();
            expect(user.accessibility).to.be.null;
        });
    });

    describe('unauthenticated', function () {
        beforeEach(async function () {
            this.server.db.users.remove();
            await invalidateSession();
        });

        it('setup is redirected to signin', async function () {
            await visit('/setup/done');
            expect(currentURL()).to.equal('/signin');
        });
    });
});
