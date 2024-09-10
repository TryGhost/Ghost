import loginAsRole from '../../helpers/login-as-role';
import {click, currentURL, fillIn, find, waitFor, waitUntil} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

const titleSelector = '[data-test-editor-title-input]';
const editorSelector = '[data-secondary-instance="false"] [data-lexical-editor]';
const unsavedModalSelector = '[data-test-modal="unsaved-post-changes"]';
const backToPostsSelector = '[data-test-link="posts"]';

const pasteInEditor = async (text) => {
    await waitFor(editorSelector);
    await click(editorSelector);
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    document.activeElement.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dataTransfer, bubbles: true, cancelable: true}));
    dataTransfer.clearData();
    const editor = find(editorSelector);
    await waitUntil(() => editor.textContent.includes(text));
};

describe('Acceptance: Editor: Unsaved changes', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures();
        await loginAsRole('Administrator', this.server);
    });

    describe('triggers modal', function () {
        // published content should never autosave and should warn on leaving when there's changes
        it('when published title has changed', async function () {
            const post = this.server.create('post', {
                title: 'Test Post',
                status: 'published'
            });
            await visit('/editor/post/' + post.id);
            await fillIn(titleSelector, 'New Title');
            // modal is shown and navigation is blocked
            await click(backToPostsSelector);
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.exist;
            // post was not saved
            expect(currentURL(), 'currentURL').to.equal(`/editor/post/${post.id}`);
        });

        it('when published content has changed', async function () {
            const post = this.server.create('post', {
                title: 'Test Post',
                status: 'published'
            });
            await visit('/editor/post/' + post.id);
            await pasteInEditor('New content');
            await click(backToPostsSelector);
            // modal is shown and navigation is blocked
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.exist;
            expect(currentURL(), 'currentURL').to.equal(`/editor/post/${post.id}`);
            // post was not saved
            expect(this.server.db.posts.find(post.id).lexical).to.equal(undefined);
        });

        it('when scheduled title has changed', async function () {
            const post = this.server.create('post', {
                title: 'Test Post',
                status: 'scheduled'
            });
            await visit('/editor/post/' + post.id);
            await fillIn(titleSelector, 'New Title');
            await click(backToPostsSelector);
            // modal is shown and navigation is blocked
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.exist;
            expect(currentURL(), 'currentURL').to.equal(`/editor/post/${post.id}`);
            // post was not saved
            expect(this.server.db.posts.find(post.id).title).to.equal('Test Post');
        });

        it('when scheduled content has changed', async function () {
            const post = this.server.create('post', {
                title: 'Test Post',
                status: 'scheduled'
            });
            await visit('/editor/post/' + post.id);
            await pasteInEditor('New content');
            await click(backToPostsSelector);
            // modal is shown and navigation is blocked
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.exist;
            expect(currentURL(), 'currentURL').to.equal(`/editor/post/${post.id}`);
            // post was not saved
            expect(this.server.db.posts.find(post.id).lexical).to.equal(undefined);
        });
    });

    describe('does not trigger modal', function () {
        // draft content should autosave and leave without warning
        it('when leaving after making changes to draft', async function () {
            const post = this.server.create('post', {
                title: 'Test Post',
                status: 'draft'
            });
            await visit('/editor/post/' + post.id);
            await fillIn(titleSelector, 'New Title');
            await click(backToPostsSelector);
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.not.exist;

            // new title should be saved
            expect(post.title, 'saved post title').to.equal('New Title');
            expect(currentURL(), 'currentURL').to.equal('/posts');
        });

        it('when loading and leaving published post', async function () {
            const post = this.server.create('post', {status: 'published', lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is a test","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'});
            await visit(`/editor/post/${post.id}`);
            await click(backToPostsSelector);
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.not.exist;
        });

        it('when publishing post', async function () {
            const post = this.server.create('post', {status: 'draft'});
            await visit(`/editor/post/${post.id}`);
            await fillIn(titleSelector, 'Test');
            await fillIn(editorSelector, 'This is a test');
            await click('[data-test-button="publish-flow"]');
            await click('[data-test-button="continue"]');
            await click('[data-test-button="confirm-publish"]');
            await click('[data-test-button="close-publish-flow"]');
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.not.exist;
            expect(currentURL(), 'currentURL').to.equal('/posts');
        });

        // published and edited content should not warn when changes are reverted (either via undo or manually)
        it('when changing title and changing it back', async function () {
            const post = this.server.create('post', {
                title: 'Test Post',
                status: 'published',
                lexical: `{"root":{"children":[{"children": [{"detail": 0,"format": 0,"mode": "normal","style": "","text": "Sample content","type": "extended-text","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "paragraph","version": 1}],"direction": "ltr","format": "","indent": 0,"type": "root","version": 1}}`
            });
            await visit('/editor/post/' + post.id);
            await fillIn('[data-test-editor-title-input]', 'New Title');
            await click('[data-test-link="posts"]');
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.exist;
            await click('[data-test-stay-button]');
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.not.exist;
            // revert title
            await fillIn('[data-test-editor-title-input]', 'Test Post');
            await click('[data-test-link="posts"]');
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.not.exist;
        });

        it('when publishing post with trailing whitespace in title', async function () {
            const post = this.server.create('post', {
                title: 'Test Post',
                status: 'draft'
            });
            await visit(`/editor/post/${post.id}`);
            await fillIn(titleSelector, 'Test Post ');
            await click('[data-test-button="publish-flow"]');
            await click('[data-test-button="continue"]');
            await click('[data-test-button="confirm-publish"]');
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.not.exist;
            await click('[data-test-button="close-publish-flow"]');
            expect(find(unsavedModalSelector), 'unsaved changes modal').to.not.exist;
            expect(currentURL(), 'currentURL').to.equal('/posts');
        });
    });
});
