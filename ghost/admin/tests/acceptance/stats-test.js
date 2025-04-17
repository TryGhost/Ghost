import loginAsRole from '../helpers/login-as-role';
import {currentURL, find, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {invalidateSession} from 'ember-simple-auth/test-support';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Stats', function () {
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

        // Tests to be written
        it('can filter by audience type', async function () {});
        it('can filter by date range', async function () {});
        it('can filter by number of days', async function () {});

        it('shows sum of unique visits', async function () {});
        it('shows sum of visits', async function () {});
        it('shows sum of pageviews', async function () {});
        it('shows average bounce rate', async function () {});
        it('shows average visit duration', async function () {});

        it('can switch between kpi tabs', async function () {});

        it('shows unique visits chart', async function () {});
        it('shows visits chart', async function () {});
        it('shows pageviews chart', async function () {});
        it('shows bounce rate chart', async function () {});
        it('shows visit duration chart', async function () {});

        it('shows "content" bar list chart', async function () {});
        it('can filter for posts', async function () {});
        it('can filter for pages', async function () {});
        it('can view all "content" stat', async function () {});

        it('shows "sources" bar list chart', async function () {});
        it('can filter for campaigns', async function () {});
        it('can view all "sources" stat', async function () {});

        it('shows "countries" bar list chart', async function () {});
        it('can view all "countries" stat', async function () {});

        it('can switch between technical tabs', async function () {});
        it('shows "devices" chart', async function () {});
        it('shows "browsers" chart', async function () {});
        it('shows "OS" chart', async function () {});
    });
});
