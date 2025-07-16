import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {click, currentURL, find, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {disableLabsFlag, enableLabsFlag} from '../helpers/labs-flag';
import {enableMembers} from '../helpers/members';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Onboarding', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);
    
    // Helper selectors for better readability
    const checklist = () => find('[data-test-dashboard="onboarding-checklist"]');
    const skipOnboarding = '#ob-skip';

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');
        this.server.loadFixtures('themes');

        enableMembers(this.server);
    });

    describe('checklist (owner)', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role], slug: 'owner'});
            await authenticateSession();
        });

        it('dashboard does not show checklist by default', async function () {
            await visit('/dashboard');
            expect(currentURL()).to.equal('/dashboard');

            // onboarding isn't shown
            expect(checklist()).to.not.exist;

            // other default dashboard elements are visible
            expect(find('[data-test-dashboard="header"]'), 'header').to.exist;
            expect(find('[data-test-dashboard="attribution"]'), 'attribution section').to.exist;
        });

        it('dashboard shows the checklist after accessing setup/done', async function () {
            await visit('/setup/done');
            expect(currentURL()).to.equal('/dashboard');

            // main onboarding list is visible
            expect(checklist()).to.exist;

            // other default dashboard elements get hidden
            expect(find('[data-test-dashboard="header"]'), 'header').to.not.exist;
            expect(find('[data-test-dashboard="attribution"]'), 'attribution section').to.not.exist;
        });

        it('checklist is shown when members disabled', async function () {
            this.server.db.settings.update({membersSignupAccess: 'none'});
            await visit('/setup/done');
            await visit('/dashboard');

            // onboarding is't shown
            expect(checklist()).to.exist;

            // other default dashboard elements are not visible
            expect(find('[data-test-dashboard="header"]'), 'header').to.not.exist;
            expect(find('[data-test-dashboard="attribution"]'), 'attribution section').to.not.exist;
        });
    });

    describe('checklist (non-owner)', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role], slug: 'admin'});
            await authenticateSession();
        });

        it('dashboard doesn\'t show the checklist', async function () {
            await visit('/dashboard');
            expect(currentURL()).to.equal('/dashboard');

            // onboarding isn't shown
            expect(checklist()).to.not.exist;

            // other default dashboard elements are visible
            expect(find('[data-test-dashboard="header"]'), 'header').to.exist;
            expect(find('[data-test-dashboard="attribution"]'), 'attribution section').to.exist;
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
    
    describe('onboarding with beta flags (owner)', function () {
        beforeEach(async function () {
            mockAnalyticsApps();
            
            // Create owner user and authenticate
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role], slug: 'owner'});
            await authenticateSession();
            
            // Disable all flags by default
            disableLabsFlag(this.server, 'trafficAnalytics');
            disableLabsFlag(this.server, 'ui60');
        });

        afterEach(function () {
            cleanupMockAnalyticsApps();
        });

        it('with no flags shows checklist on dashboard after setup/done', async function () {
            await visit('/setup/done');
            expect(currentURL()).to.equal('/dashboard');
            expect(checklist()).to.exist;
            
            await click(skipOnboarding);
            expect(checklist()).to.not.exist;
            
            expect(currentURL()).to.equal('/dashboard');
        });

        it('with trafficAnalytics flag shows checklist on analytics after setup/done', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            
            await visit('/setup/done');
            expect(currentURL()).to.equal('/analytics');
            expect(checklist()).to.exist;
            
            await click(skipOnboarding);
            expect(checklist()).to.not.exist;
            
            expect(currentURL()).to.equal('/analytics');
        });

        it('with ui60 flag shows checklist on analytics after setup/done', async function () {
            enableLabsFlag(this.server, 'ui60');
            
            await visit('/setup/done');
            expect(currentURL()).to.equal('/analytics');
            expect(checklist()).to.exist;
            
            await click(skipOnboarding);
            expect(checklist()).to.not.exist;
            
            expect(currentURL()).to.equal('/analytics');
        });

        it('with both flags shows checklist on analytics after setup/done', async function () {
            enableLabsFlag(this.server, 'trafficAnalytics');
            enableLabsFlag(this.server, 'ui60');
            
            await visit('/setup/done');
            expect(currentURL()).to.equal('/analytics');
            expect(checklist()).to.exist;
            
            await click(skipOnboarding);
            expect(checklist()).to.not.exist;
            
            expect(currentURL()).to.equal('/analytics');
        });
    });
});
