import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {currentURL, find, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {enableLabsFlag} from '../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Dashboard', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');
        enableLabsFlag(this.server, 'membersActivity');
        enableLabsFlag(this.server, 'improvedOnboarding');

        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    it('can visit /dashboard', async function () {
        await visit('/dashboard');
        expect(currentURL()).to.equal('/dashboard');
    });

    it('/ redirects to /dashboard', async function () {
        await visit('/');
        expect(currentURL()).to.equal('/dashboard');
    });

    describe('members graphs', function () {
        it('is shown when members exist', async function () {
            this.server.createList('member', 5);
            await visit('/dashboard');
            expect(find('[data-test-dashboard-members-graphs]'), 'members graphs block').to.exist;
        });

        it('is hidden when no members exist', async function () {
            this.server.db.members.remove();
            await visit('/dashboard');
            expect(find('[data-test-dashboard-members-graphs]'), 'members graphs block').to.not.exist;
        });

        it('is hidden when members is disabled', async function () {
            this.server.createList('member', 5);
            this.server.db.settings.update({key: 'members_signup_access'}, {value: 'none'});

            await visit('/dashboard');
            expect(find('[data-test-dashboard-members-graphs]'), 'members graphs block').to.not.exist;
        });
    });

    describe('permissions', function () {
        beforeEach(async function () {
            this.server.db.users.remove();
            await invalidateSession();
        });

        it('is not accessible when logged out', async function () {
            await visit('/dashboard');
            expect(currentURL()).to.equal('/signin');
        });
    });
});
