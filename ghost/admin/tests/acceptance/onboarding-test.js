import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {currentURL, find, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableMembers} from '../helpers/members';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Onboarding', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);
    
    // Helper selectors for better readability
    const checklist = () => find('[data-test-dashboard="onboarding-checklist"]');

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

    describe('checklist (owner)', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role], slug: 'owner'});
            await authenticateSession();
        });

        it('dashboard does not show checklist by default', async function () {
            await visit('/analytics');
            expect(currentURL()).to.equal('/analytics');

            // onboarding isn't shown
            expect(checklist()).to.not.exist;
        });

        // Onboarding checklist tests removed — checklist is now rendered by
        // the React analytics app, not Ember.
    });

    describe('checklist (non-owner)', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role], slug: 'admin'});
            await authenticateSession();
        });

        it('analytics doesn\'t show the checklist', async function () {
            await visit('/analytics');
            expect(currentURL()).to.equal('/analytics');

            // onboarding isn't shown
            expect(checklist()).to.not.exist;
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
