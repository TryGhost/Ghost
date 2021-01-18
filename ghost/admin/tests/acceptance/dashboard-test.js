import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, find, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Dashboard', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    it('is not accessible when logged out', async function () {
        await visit('/dashboard');
        expect(currentURL()).to.equal('/signin');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            // TODO: remove this setup when out of dev experiments
            this.server.loadFixtures('configs');
            const config = this.server.schema.configs.first();
            config.update({
                enableDeveloperExperiments: true
            });

            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('can visit /dashboard', async function () {
            await visit('/dashboard');
            expect(currentURL()).to.equal('/dashboard');
        });
    });

    // TODO: remove this whole section when out of dev experiments
    describe('developer experiments', function () {
        describe('when disabled', function () {
            beforeEach(async function () {
                this.server.loadFixtures('configs');
                const config = this.server.schema.configs.first();
                config.update({
                    enableDeveloperExperiments: false
                });

                let role = this.server.create('role', {name: 'Administrator'});
                this.server.create('user', {roles: [role]});

                return await authenticateSession();
            });

            it('/dashboard redirects to /site', async function () {
                await visit('/dashboard');
                expect(currentURL()).to.equal('/site');
            });

            it('/ redirects to /site', async function () {
                await visit('/');
                expect(currentURL()).to.equal('/site');
            });

            it('does not have a nav menu item', async function () {
                await visit('/posts');
                expect(find('[data-test-nav="dashboard"]')).to.not.exist;
            });
        });

        describe('when enabled', function () {
            beforeEach(async function () {
                this.server.loadFixtures('configs');
                const config = this.server.schema.configs.first();
                config.update({
                    enableDeveloperExperiments: true
                });

                let role = this.server.create('role', {name: 'Administrator'});
                this.server.create('user', {roles: [role]});

                return await authenticateSession();
            });

            it('/ redirects to /dashboard', async function () {
                await visit('/');
                expect(currentURL()).to.equal('/dashboard');
            });

            it('has a nav menu item', async function () {
                await visit('/posts');
                expect(currentURL()).to.equal('/posts');
                expect(find('[data-test-nav="dashboard"]')).to.exist;
                await click('[data-test-nav="dashboard"]');
                expect(currentURL()).to.equal('/dashboard');
            });
        });
    });
});
