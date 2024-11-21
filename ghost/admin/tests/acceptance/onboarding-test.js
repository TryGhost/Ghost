import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {currentURL, find, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableMembers} from '../helpers/members';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Onboarding', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

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
            expect(find('[data-test-dashboard="onboarding-checklist"]'), 'checklist').to.not.exist;

            // other default dashboard elements are visible
            expect(find('[data-test-dashboard="header"]'), 'header').to.exist;
            expect(find('[data-test-dashboard="attribution"]'), 'attribution section').to.exist;
        });

        it('dashboard shows the checklist after accessing setup/done', async function () {
            await visit('/setup/done');
            expect(currentURL()).to.equal('/dashboard');

            // main onboarding list is visible
            expect(find('[data-test-dashboard="onboarding-checklist"]'), 'checklist').to.exist;

            // other default dashboard elements get hidden
            expect(find('[data-test-dashboard="header"]'), 'header').to.not.exist;
            expect(find('[data-test-dashboard="attribution"]'), 'attribution section').to.not.exist;
        });

        it('checklist is shown when members disabled', async function () {
            this.server.db.settings.update({membersSignupAccess: 'none'});
            await visit('/setup/done');
            await visit('/dashboard');

            // onboarding is't shown
            expect(find('[data-test-dashboard="onboarding-checklist"]'), 'checklist').to.exist;

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
            expect(find('[data-test-dashboard="onboarding-checklist"]'), 'checklist').to.not.exist;

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
});
