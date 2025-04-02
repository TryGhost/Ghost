import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {currentURL} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Dashboard', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    describe('permissions', function () {
        beforeEach(async function () {
            this.server.db.users.remove();
            await invalidateSession();
        });

        it('is not accessible when logged out', async function () {
            await visit('/dashboard');
            expect(currentURL()).to.equal('/signin');
        });

        it('is accessible to owners', async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
            await visit('/dashboard');

            expect(currentURL()).to.equal('/dashboard');
        });

        it('is not accessible to editors', async function () {
            this.server.db.users.remove();

            let role = this.server.create('role', {name: 'Editor'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
            await visit('/dashboard');

            expect(currentURL()).to.equal('/site');
        });

        it('is not accessible to authors', async function () {
            let role = this.server.create('role', {name: 'Author'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
            await visit('/dashboard');
            expect(currentURL()).to.equal('/site');
        });

        it('is not accessible to super editors', async function () {
            let role = this.server.create('role', {name: 'Super Editor'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
            await visit('/dashboard');

            expect(currentURL()).to.equal('/site');
        });
    });
    describe('as admin', function () {
        beforeEach(async function () {
            await invalidateSession();
            this.server.db.users.remove();

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
    });
});
