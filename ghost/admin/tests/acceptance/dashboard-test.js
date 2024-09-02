import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {currentURL, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Dashboard', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
        this.server.loadFixtures('settings');

        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
    });

    it('can visit /dashboard', async function () {
        await visit('/dashboard');
        expect(currentURL()).to.equal('/dashboard');
    });

    it('/ redirects to /dashboard', async function () {
        await visit('/');
        expect(currentURL()).to.equal('/dashboard');
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
