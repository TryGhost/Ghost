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
        await visit('/lexical-editor/post/');
        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to posts screen if editor.lexicalUrl config is missing', async function () {
        await loginAsRole('Administrator', this.server);
        await visit('/lexical-editor/post/');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    it('loads when editor.lexicalUrl is present', async function () {
        const config = this.server.schema.configs.find(1);
        config.attrs.editor = {lexicalUrl: 'https://cdn.pkg/editor.js'};
        config.save();

        // stub loaded external module
        window.KoenigLexical = {
            KoenigComposer: () => null,
            KoenigEditor: () => null
        };

        await loginAsRole('Administrator', this.server);
        await visit('/lexical-editor/post/');
        expect(currentURL(), 'currentURL').to.equal('/lexical-editor/post/');
    });
});
