import loginAsRole from '../../helpers/login-as-role';
import {blur, click, currentURL, fillIn, find, waitFor, waitUntil} from '@ember/test-helpers';
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

    describe('with new post', function () {
        it('loads editor', async function () {
            await visit('/editor/post/');
            expect(currentURL(), 'currentURL').to.equal('/editor/post/');

            await waitFor('[data-secondary-instance="false"] [data-lexical-editor]');
            // find the placeholder div
            const xpath = '//div[text()="Begin writing your post..."]';
            const match = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            expect(match.singleNodeValue).to.exist;
        });

        it('can leave editor without unsaved changes modal', async function () {
            await visit('/editor/post/');
            await click('[data-test-link="posts"]');
            expect(find('[data-test-modal="unsaved-post-changes"]')).to.not.exist;
            expect(currentURL(), 'currentURL').to.equal('/posts');
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

    describe('with existing post', function () {
        it('loads editor', async function () {
            const post = this.server.create('post', {lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is a test","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'});
            await visit(`/editor/post/${post.id}`);
            expect(currentURL(), 'currentURL').to.equal(`/editor/post/${post.id}`);
            await waitFor('[data-secondary-instance="false"] [data-lexical-editor]');
            // find the post content
            expect(find('[data-secondary-instance="false"] [data-lexical-editor]')).to.contain.text('This is a test');
        });

        it('does not save post on title blur', async function () {
            const post = this.server.create('post', {status: 'published'});
            const originalTitle = post.title;

            await visit('/editor/post/1');
            await fillIn('[data-test-editor-title-input]', 'Change test');
            await blur('[data-test-editor-title-input]');

            expect(find('[data-test-editor-post-status]')).not.to.contain.text('Saved');
            expect(post.status, 'post status').to.equal('published');
            expect(post.title, 'saved title').to.equal(originalTitle);

            await click('[data-test-link="posts"]');

            expect(find('[data-test-modal="unsaved-post-changes"]'), 'unsaved changes modal').to.exist;

            expect(currentURL(), 'currentURL').to.equal(`/editor/post/1`);
        });

        it('does not save post on excerpt blur', async function () {
            // excerpt is not shown by default
            enableLabsFlag(this.server, 'editorExcerpt');

            const post = this.server.create('post', {status: 'published'});
            const originalExcerpt = post.excerpt;

            await visit('/editor/post/1');
            await fillIn('[data-test-textarea="excerpt"]', 'Change test');
            await blur('[data-test-textarea="excerpt"]');

            expect(find('[data-test-editor-post-status]')).not.to.contain.text('Saved');
            expect(post.status, 'post status').to.equal('published');
            expect(post.excerpt, 'saved excerpt').to.equal(originalExcerpt);

            await click('[data-test-link="posts"]');

            expect(find('[data-test-modal="unsaved-post-changes"]'), 'unsaved changes modal').to.exist;

            expect(currentURL(), 'currentURL').to.equal(`/editor/post/1`);
        });
    });
});
