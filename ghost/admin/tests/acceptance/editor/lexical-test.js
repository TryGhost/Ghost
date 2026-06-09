import loginAsRole from '../../helpers/login-as-role';
import {blur, click, currentURL, fillIn, find, triggerEvent, triggerKeyEvent, waitFor, waitUntil} from '@ember/test-helpers';
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

        it('customizes editor typography', async function () {
            const post = this.server.create('post', {lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is a test","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'});
            await visit(`/editor/post/${post.id}`);
            await waitFor('[data-secondary-instance="false"] [data-lexical-editor] p');

            expect(find('[data-test-editor-typography-trigger]'), 'typography trigger').to.exist;
            expect(find('.gh-koenig-editor').classList.contains('gh-editor-font-serif'), 'default font class').to.be.true;
            expect(find('.gh-koenig-editor').classList.contains('gh-editor-font-size-medium'), 'default size class').to.be.true;

            await click('[data-test-editor-typography-trigger]');
            expect(find('.gh-editor-typography-menu').classList.contains('open'), 'typography menu opens').to.be.true;

            await click('[data-secondary-instance="false"] [data-lexical-editor] p');
            expect(find('.gh-editor-typography-menu').classList.contains('closed'), 'typography menu closes on outside click').to.be.true;

            await click('[data-test-editor-typography-trigger]');
            await click('[data-test-editor-font-style="sans"]');
            await click('[data-test-editor-font-size="large"]');

            let accessibility = JSON.parse(this.server.schema.users.find('1').accessibility);
            expect(accessibility.editor.fontStyle, 'stored font style').to.equal('sans');
            expect(accessibility.editor.fontSize, 'stored font size').to.equal('large');
            expect(find('.gh-koenig-editor').classList.contains('gh-editor-font-sans'), 'updated font class').to.be.true;
            expect(find('.gh-koenig-editor').classList.contains('gh-editor-font-size-large'), 'updated size class').to.be.true;
            const koenigEditorStyles = window.getComputedStyle(find('.gh-koenig-editor'));
            expect(koenigEditorStyles.getPropertyValue('--koenig-editor-body-font-size').trim(), 'Koenig body font size variable').to.equal('2.2rem');
            expect(koenigEditorStyles.getPropertyValue('--koenig-editor-body-letter-spacing').trim(), 'Koenig body letter spacing variable').to.equal('-0.022em');

            await click('[data-test-editor-auto-hide-toolbar-toggle]');
            accessibility = JSON.parse(this.server.schema.users.find('1').accessibility);
            expect(accessibility.editor.autoHideToolbar, 'stored auto-hide toolbar').to.be.true;

            await triggerKeyEvent('[data-secondary-instance="false"] [data-lexical-editor]', 'keydown', 'A');
            expect(find('.gh-editor-fullscreen-container').classList.contains('gh-editor-chrome-hidden'), 'chrome hidden while typing').to.be.true;
            expect(window.getComputedStyle(find('.settings-menu-toggle')).pointerEvents, 'settings menu toggle disabled while hidden').to.equal('none');

            await triggerEvent('.gh-editor-fullscreen-container', 'mousemove');
            expect(find('.gh-editor-fullscreen-container').classList.contains('gh-editor-chrome-hidden'), 'chrome restored on mouse move').to.be.false;

            await click('[data-test-psm-trigger]');
            await triggerKeyEvent('[data-secondary-instance="false"] [data-lexical-editor]', 'keydown', 'A');

            expect(find('.gh-editor-fullscreen-container').classList.contains('gh-editor-chrome-hidden'), 'chrome hidden while typing with sidebar open').to.be.true;
            expect(window.getComputedStyle(find('.settings-menu-toggle')).pointerEvents, 'settings menu toggle remains enabled when sidebar is open').to.not.equal('none');
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
