import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
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

    it('has working happy path for small import with no mapper changes and Stripe not connected', async function () {
        await visit('/members/import');

        const csv = `email,name,note,subscribed_to_emails,labels,created_at
testemail@example.com,Test Email,This is a test template for importing your members list to Ghost,true,"vip,promotion",2019-10-30T14:52:08.000Z
`;

        await fileUpload(
            '[data-test-fileinput="members-csv"]',
            [csv],
            {name: 'members.csv', type: 'text/csv'}
        );

        expect(find('[data-test-csv-file-mapping]'), 'csv file mapper').to.exist;
        expect(find('[data-test-members-import-table]'), 'csv file mapper').to.exist;
        expect(findAll('[data-test-members-import-mapper]').length, '# of mapper rows').to.equal(6);
        expect(find('[data-test-button="perform-import"]')).to.contain.text(' 1 ');

        await click('[data-test-button="perform-import"]');

        expect(find('[data-test-modal="import-members"]')).to.contain.text('Import complete');

        await click('[data-test-button="close-import-members"]');

        expect(find('[data-test-modal="import-members"]')).to.not.exist;
    });
});
