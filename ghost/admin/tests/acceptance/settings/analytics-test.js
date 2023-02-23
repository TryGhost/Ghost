import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, find} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Analytics', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs', 'newsletters');

        const role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    it('can manage open rate tracking', async function () {
        this.server.db.settings.update({key: 'email_track_opens'}, {value: 'true'});

        await visit('/settings/analytics');

        expect(find('[data-test-checkbox="email-track-opens"]')).to.be.checked;

        await click('[data-test-label="email-track-opens"]');
        expect(find('[data-test-checkbox="email-track-opens"]')).to.not.be.checked;

        await click('[data-test-button="save-analytics-settings"]');

        expect(this.server.db.settings.findBy({key: 'email_track_opens'}).value).to.equal(false);
    });

    it('can manage click tracking', async function () {
        this.server.db.settings.update({key: 'email_track_clicks'}, {value: 'true'});

        await visit('/settings/analytics');

        expect(find('[data-test-checkbox="email-track-clicks"]')).to.be.checked;

        await click('[data-test-label="email-track-clicks"]');
        expect(find('[data-test-checkbox="email-track-clicks"]')).to.not.be.checked;

        await click('[data-test-button="save-analytics-settings"]');

        expect(this.server.db.settings.findBy({key: 'email_track_clicks'}).value).to.equal(false);
    });

    it('can manage source tracking', async function () {
        this.server.db.settings.update({key: 'members_track_sources'}, {value: 'true'});

        await visit('/settings/analytics');

        expect(find('[data-test-checkbox="members-track-sources"]')).to.be.checked;

        await click('[data-test-label="members-track-sources"]');
        expect(find('[data-test-checkbox="members-track-sources"]')).to.not.be.checked;

        await click('[data-test-button="save-analytics-settings"]');

        expect(this.server.db.settings.findBy({key: 'members_track_sources'}).value).to.equal(false);
    });

    it('can manage outbound link tagging', async function () {
        this.server.db.settings.update({key: 'outbound_link_tagging'}, {value: 'true'});

        await visit('/settings/analytics');

        expect(find('[data-test-checkbox="outbound-link-tagging"]')).to.be.checked;

        await click('[data-test-label="outbound-link-tagging"]');
        expect(find('[data-test-checkbox="outbound-link-tagging"]')).to.not.be.checked;

        await click('[data-test-button="save-analytics-settings"]');

        expect(this.server.db.settings.findBy({key: 'outbound_link_tagging'}).value).to.equal(false);
    });
});
