import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, find} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Members email', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');

        const role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    it('can manage open rate tracking', async function () {
        this.server.db.settings.update({key: 'email_track_opens'}, {value: 'true'});

        await visit('/settings/members-email');
        expect(find('[data-test-checkbox="email-track-opens"]')).to.be.checked;

        await click('label[for="email-track-opens"]');
        expect(find('[data-test-checkbox="email-track-opens"]')).to.not.be.checked;

        await click('[data-test-button="save-members-settings"]');

        expect(this.server.db.settings.findBy({key: 'email_track_opens'}).value).to.equal(false);
    });
});
