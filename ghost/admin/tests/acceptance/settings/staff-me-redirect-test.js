import {beforeEach, describe, it} from 'mocha';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {currentURL} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Staff /me redirect', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        let role = this.server.create('role', {name: 'Administrator'});
        this.server.create('user', {id: '1', roles: [role], slug: 'admin-user'});
        await authenticateSession();
    });

    it('redirects /settings/staff/me to current user profile', async function () {
        await visit('/settings/staff/me');
        expect(currentURL()).to.equal('/settings/staff/admin-user');
    });

    it('redirects /settings/staff/me/edit to current user edit', async function () {
        await visit('/settings/staff/me/edit');
        expect(currentURL()).to.equal('/settings/staff/admin-user/edit');
    });

    it('redirects /settings/staff/me for non-admin roles', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.db.users.update(1, {roles: [role]});

        await visit('/settings/staff/me');
        expect(currentURL()).to.equal('/settings/staff/admin-user');
    });

    it('redirects /settings/staff/me for contributors to own profile', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.db.users.update(1, {roles: [role]});

        await visit('/settings/staff/me');
        expect(currentURL()).to.equal('/settings/staff/admin-user');
    });
});
