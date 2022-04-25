import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, find} from '@ember/test-helpers';
import {disableLabsFlag, enableLabsFlag} from '../../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Members email (multipleNewsletters)', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');

        const role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        enableLabsFlag(this.server, 'multipleNewsletters');

        return await authenticateSession();
    });

    it('without flag - redirects labs to original', async function () {
        disableLabsFlag(this.server, 'multipleNewsletters');
        await visit('/settings/newsletters');
        expect(currentURL()).to.equal('/settings/members-email');
    });

    it('with flag - redirects original to labs', async function () {
        await visit('/settings/members-email');
        expect(currentURL()).to.equal('/settings/newsletters');
    });

    it('can manage open rate tracking', async function () {
        this.server.db.settings.update({key: 'email_track_opens'}, {value: 'true'});

        await visit('/settings/newsletters');
        expect(find('[data-test-checkbox="email-track-opens"]')).to.be.checked;

        await click('[data-test-label="email-track-opens"]');
        expect(find('[data-test-checkbox="email-track-opens"]')).to.not.be.checked;

        await click('[data-test-button="save-members-settings"]');

        expect(this.server.db.settings.findBy({key: 'email_track_opens'}).value).to.equal(false);
    });
});
