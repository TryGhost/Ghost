import {authenticateSession} from 'ember-simple-auth/test-support';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../../helpers/mock-analytics-apps';
import {click, find} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Editor / Post Settings Menu', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    let author;

    beforeEach(async function () {
        mockAnalyticsApps();
        this.server.loadFixtures();

        let role = this.server.create('role', {name: 'Administrator'});
        author = this.server.create('user', {roles: [role]});

        await authenticateSession();
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    it('displays publish time converted to site timezone', async function () {
        // Create a published post at 12:00 UTC on Jan 15
        let post = this.server.create('post', {
            authors: [author],
            status: 'published',
            publishedAt: '2024-01-15T12:00:00.000Z'
        });

        // Set site timezone to Asia/Tokyo (UTC+9)
        this.server.db.settings.update({key: 'timezone'}, {value: 'Asia/Tokyo'});

        await visit(`/editor/post/${post.id}`);
        await click('[data-test-psm-trigger]');

        // 12:00 UTC = 21:00 JST
        expect(find('[data-test-date-time-picker-timezone]').textContent.trim(), 'timezone label').to.equal('JST');
        expect(find('[data-test-date-time-picker-time-input]').value, 'time in JST').to.equal('21:00');
        expect(find('[data-test-date-time-picker-date-input]').value, 'date in JST').to.match(/-15$/);
    });
});
