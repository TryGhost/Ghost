import loginAsRole from '../../helpers/login-as-role';
import {BLANK_DOC} from 'koenig-editor/components/koenig-editor';
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

    it('redirects mobiledoc editor to lexical editor when post.lexical is present', async function () {
        const post = this.server.create('post', {
            lexical: JSON.stringify({})
        });

        await loginAsRole('Administrator', this.server);
        await visit(`/editor/post/${post.id}`);

        expect(currentURL()).to.equal(`/editor/post/${post.id}`);
    });

    it('does not redirect to mobiledoc editor when post.mobiledoc is present', async function () {
        const post = this.server.create('post', {
            mobiledoc: JSON.stringify(BLANK_DOC)
        });

        await loginAsRole('Administrator', this.server);
        await visit(`/editor/post/${post.id}`);

        expect(currentURL()).to.equal(`/editor/post/${post.id}`);
    });
});
