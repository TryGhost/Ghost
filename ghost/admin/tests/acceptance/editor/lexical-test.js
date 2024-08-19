import loginAsRole from '../../helpers/login-as-role';
import {blur, currentURL, fillIn, find, waitUntil} from '@ember/test-helpers';
import {enableLabsFlag} from '../../helpers/labs-flag';
import {expect} from 'chai';
import {invalidateSession} from 'ember-simple-auth/test-support';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Lexical editor', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures();
        await loginAsRole('Administrator', this.server);
    });

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/editor/post/');
        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    describe('new post', function () {
        // TODO: test it actually loads the editor
        it('loads editor', async function () {
            await visit('/editor/post/');
            expect(currentURL(), 'currentURL').to.equal('/editor/post/');
        });

        it('saves on title change', async function () {
            await visit('/editor/post/');
            await fillIn('[data-test-editor-title-input]', 'Test Post');
            await blur('[data-test-editor-title-input]');

            // NOTE: during testing we switch status so quickly this doesn't catch the intermediate state
            // await waitUntil(function () {
            //     return find('[data-test-editor-post-status]').textContent.includes('Saving...');
            // });

            await waitUntil(function () {
                return find('[data-test-editor-post-status]').textContent.includes('Saved');
            }, {timeoutMessage: 'Timed out waiting for "Saved" status'});

            expect(currentURL(), 'currentURL').to.equal(`/editor/post/1`);
        });

        it('saves on excerpt change', async function () {
            // excerpt is not shown by default
            enableLabsFlag(this.server, 'editorExcerpt');

            await visit('/editor/post/');
            await fillIn('[data-test-textarea="excerpt"]', 'Test Post');
            await blur('[data-test-textarea="excerpt"]');

            await waitUntil(function () {
                return find('[data-test-editor-post-status]').textContent.includes('Saved');
            }, {timeoutMessage: 'Timed out waiting for "Saved" status'});

            expect(currentURL(), 'currentURL').to.equal(`/editor/post/1`);
        });

        // TODO: requires editor to be loading
        it('saves on content change');
    });
});
