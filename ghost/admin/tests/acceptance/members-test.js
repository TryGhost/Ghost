import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find} from '@ember/test-helpers';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../helpers/mock-analytics-apps';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Members Test', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        mockAnalyticsApps();
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects roles without member management permission to site', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/site');
    });

    describe('as owner', function () {
        beforeEach(async function () {
            this.server.loadFixtures('configs');

            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('mounts the React members screen on the members route', async function () {
            await visit('/members');

            expect(currentURL()).to.equal('/members');
            expect(find('[data-test-posts-component]')).to.exist;
        });

        it('can edit an existing member directly', async function () {
            let member = this.server.create('member');

            await visit(`/members/${member.id}`);

            expect(find('[data-test-input="member-name"]').value).to.equal(member.name);
            expect(find('[data-test-input="member-email"]').value).to.equal(member.email);

            await fillIn('[data-test-input="member-name"]', 'New Name');
            await blur('[data-test-input="member-name"]');

            await click('[data-test-button="save"]');
            await click('[data-test-link="members-back"]');

            expect(currentURL()).to.equal('/members');
        });

        it('can create a new member directly', async function () {
            await visit('/members/new');

            expect(currentURL()).to.equal('/members/new');
            expect(find('.gh-canvas-header h2').textContent).to.contain('New');

            await fillIn('[data-test-input="member-name"]', 'New Name');
            await blur('[data-test-input="member-name"]');

            await fillIn('[data-test-input="member-email"]', 'example@domain.com');
            await blur('[data-test-input="member-email"]');

            await click('[data-test-button="save"]');

            expect(find('[data-test-input="member-name"]').value).to.equal('New Name');
            expect(find('[data-test-input="member-email"]').value).to.equal('example@domain.com');
        });
    });
});
