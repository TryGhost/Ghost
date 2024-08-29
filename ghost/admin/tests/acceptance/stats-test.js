import loginAsRole from '../helpers/login-as-role';
import {currentURL, find, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {invalidateSession} from 'ember-simple-auth/test-support';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe.only('Acceptance: Stats', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        this.server.loadFixtures();
    });

    describe('permissions', function () {
        it('redirects to signin when not authenticated', async function () {
            await invalidateSession();
            await visit('/stats');
            expect(currentURL()).to.equal('/signin');
        });

        it('redirects to posts page when authenticated as contributor', async function () {
            await loginAsRole('Contributor', this.server);
            await visit('/stats');
            expect(currentURL(), 'currentURL').to.equal('/posts');
        });

        it('redirects to site page when authenticated as author', async function () {
            await loginAsRole('Author', this.server);
            await visit('/stats');
            expect(currentURL(), 'currentURL').to.equal('/site');
        });

        it('redirects to dashboard when logged in as admin with no stats config set', async function () {
            await loginAsRole('Administrator', this.server);

            await visit('/stats');
            expect(currentURL()).to.equal('/dashboard');
            expect(find('[data-test-screen-title]')).to.have.rendered.trimmed.text('Dashboard');
        });

        it('can visit /stats when logged in as admin AND stats config is set', async function () {
            await loginAsRole('Administrator', this.server);

            const config = this.server.db.configs.find(1);
            config.stats = {
                endpoint: 'http://testing.com'
            };
            this.server.db.configs.update(1, config);

            await visit('/stats');
            expect(currentURL()).to.equal('/stats');
            expect(find('[data-test-screen-title]')).to.have.rendered.trimmed.text('Stats');
        });
    });
});
