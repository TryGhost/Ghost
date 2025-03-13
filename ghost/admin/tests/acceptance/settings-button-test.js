import loginAsRole from '../helpers/login-as-role';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find} from '@ember/test-helpers';
import {invalidateSession} from 'ember-simple-auth/test-support';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Settings button', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    describe('check by role', function () {
        beforeEach(async function () {
            await invalidateSession();
        });

        it('is present for editors', async function () {
            await loginAsRole('Editor', this.server);
            await visit('site');
            expect(find('[data-test-nav="settings"]')).to.exist;
        });
        it('is not present for authors', async function () {
            await loginAsRole('Author', this.server);
            await visit('site');
            expect(find('[data-test-nav="settings"]')).to.be.null;
        });
        it('is present for super editors', async function () {
            await loginAsRole('Super Editor', this.server);
            await visit('site');
            expect(find('[data-test-nav="settings"]')).to.exist;
        });
    });
});
