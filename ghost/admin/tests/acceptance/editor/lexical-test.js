import loginAsRole from '../../helpers/login-as-role';
import {currentURL} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Lexical editor', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures();
    });

    it('redirects to signin when not authenticated', async function () {
        await visit('/editor/post/');
        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('loads editor', async function () {
        await loginAsRole('Administrator', this.server);
        await visit('/editor/post/');
        expect(currentURL(), 'currentURL').to.equal('/editor/post/');
    });
});
