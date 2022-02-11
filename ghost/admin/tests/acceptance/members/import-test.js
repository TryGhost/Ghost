import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, find} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Members import', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');

        let role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    it('can open and close import modal', async function () {
        await visit('/members');
        await click('[data-test-button="members-actions"]');
        await click('[data-test-link="import-csv"]');

        expect(find('[data-test-modal="import-members"]'), 'members import modal').to.exist;
        expect(currentURL()).to.equal('/members/import');

        await click('[data-test-button="close-import-members"]');

        expect(find('[data-test-modal="import-members"]'), 'members import modal').to.not.exist;
        expect(currentURL()).to.equal('/members');
    });
});
