import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentRouteName, currentURL, find} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Members', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects non-admins to posts', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/site');
        expect(find('[data-test-nav="members"]'), 'sidebar link')
            .to.not.exist;
    });

    describe('as admin', function () {
        beforeEach(async function () {
            this.server.loadFixtures('configs');
            let config = this.server.schema.configs.first();
            config.update({enableDeveloperExperiments: true});

            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('redirects to home if developer experiments is disabled', async function () {
            let config = this.server.schema.configs.first();
            config.update({enableDeveloperExperiments: false});

            await visit('/members');

            expect(currentURL()).to.equal('/site');
            expect(find('[data-test-nav="members"]'), 'sidebar link')
                .to.not.exist;
        });

        it('shows sidebar link which navigates to members list', async function () {
            await visit('/settings/labs');
            await click('#labs-members');
            await visit('/');

            expect(find('[data-test-nav="members"]'), 'sidebar link')
                .to.exist;

            await click('[data-test-nav="members"]');

            expect(currentURL()).to.equal('/members');
            expect(currentRouteName()).to.equal('members');
            expect(find('[data-test-screen-title]')).to.have.text('Members');
        });
    });
});
