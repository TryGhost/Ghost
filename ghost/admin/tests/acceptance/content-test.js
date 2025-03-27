import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import sinon from 'sinon';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find, findAll, triggerEvent, triggerKeyEvent, visit} from '@ember/test-helpers';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

/**
 *
 * @param {string} text
 * @param {NodeList} buttons
 * @returns Node
 */
const findButton = (text, buttons) => {
    return Array.from(buttons).find(button => button.innerText.trim() === text);
};

// NOTE: With accommodations for faster loading of posts in the UI, the requests to fetch the posts have been split into separate requests based
//  on the status of the post. This means that the tests for filtering by status will have multiple requests to check against.
describe('Acceptance: Posts / Pages', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
    });

    this.afterEach(function () {
        sinon.restore();
    });

    describe('posts', function () {
        it('redirects to signin when not authenticated', async function () {
            await invalidateSession();

            await visit('/posts');
            expect(currentURL()).to.equal('/signin');
        });

        describe('as contributor', function () {
            beforeEach(async function () {
                let contributorRole = this.server.create('role', {name: 'Contributor'});
                this.server.create('user', {roles: [contributorRole]});

                await authenticateSession();
            });

            // NOTE: This test seems to fail if run AFTER the 'can change access' test in the 'as admin' section; router seems to fail, did not look into it further
            it('shows posts list and allows post creation', async function () {
                await visit('/posts');

                // has an empty state
                expect(findAll('[data-test-post-id]')).to.have.length(0);
                expect(find('[data-test-no-posts-box]')).to.exist;
                expect(find('[data-test-link="write-a-new-post"]')).to.exist;

                await click('[data-test-link="write-a-new-post"]');

                expect(currentURL()).to.equal('/editor/post');

                await fillIn('[data-test-editor-title-input]', 'First contributor post');
                await blur('[data-test-editor-title-input]');

                expect(currentURL()).to.equal('/editor/post/1');

                await click('[data-test-link="posts"]');

                expect(findAll('[data-test-post-id]')).to.have.length(1);
                expect(find('[data-test-no-posts-box]')).to.not.exist;
            });

            describe('context menu', function () {
                let publishedPost;

                beforeEach(async function () {
                    publishedPost = this.server.create('post', {status: 'published'});
                });

                it('does not render the context menu', async function () {
                    await visit('/posts');

                    // get the post
                    const post = find(`[data-test-post-id="${publishedPost.id}"]`);
                    expect(post, 'post').to.exist;

                    await triggerEvent(post, 'contextmenu');

                    let contextMenu = find('.gh-posts-context-menu');
                    expect(contextMenu, 'context menu').to.not.be.visible;
                });
            });
        });

        describe('as author', function () {
            let author, authorPost;

            beforeEach(async function () {
                let authorRole = this.server.create('role', {name: 'Author'});
                author = this.server.create('user', {roles: [authorRole]});
                let adminRole = this.server.create('role', {name: 'Administrator'});
                let admin = this.server.create('user', {roles: [adminRole]});

                // create posts
                authorPost = this.server.create('post', {authors: [author], status: 'published', title: 'Author Post'});
                this.server.create('post', {authors: [admin], status: 'scheduled', title: 'Admin Post'});

                await authenticateSession();
            });

            it('only fetches the author\'s posts', async function () {
                await visit('/posts');
                // trigger a filter request so we can grab the posts API request easily
                await selectChoose('[data-test-type-select]', 'Published posts');

                // API request includes author filter
                let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter).to.have.string(`authors:${author.slug}`);

                // only author's post is shown
                expect(findAll('[data-test-post-id]').length, 'post count').to.equal(1);
                expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author post').to.exist;
            });

            describe('context menu', function () {
                it('does not render the context menu', async function () {
                    await visit('/posts');

                    // get the post
                    const post = find(`[data-test-post-id="${authorPost.id}"]`);
                    expect(post, 'post').to.exist;

                    await triggerEvent(post, 'contextmenu');

                    let contextMenu = find('.gh-posts-context-menu');
                    expect(contextMenu, 'context menu').to.not.be.visible;
                });
            });
        });

        describe('as editor', function () {
            let editor, editorPost;

            beforeEach(async function () {
                let editorRole = this.server.create('role', {name: 'Editor'});
                editor = this.server.create('user', {roles: [editorRole]});
                editorPost = this.server.create('post', {authors: [editor], status: 'published', title: 'Editor Post'});

                await authenticateSession();
            });

            describe('context menu', function () {
                it('renders the correct options', async function () {
                    await visit('/posts');

                    const post = find(`[data-test-post-id="${editorPost.id}"]`);
                    expect(post, 'post').to.exist;

                    await triggerEvent(post, 'contextmenu');

                    // Test that the context menu is rendered
                    const contextMenu = find('.gh-posts-context-menu');
                    expect(contextMenu, 'context menu').to.exist;

                    // Test that the context menu has the correct buttons
                    const buttons = contextMenu.querySelectorAll('button');
                    expect(buttons.length, 'context menu buttons').to.equal(5);
                    expect(buttons[0].innerText.trim(), 'context menu button 1').to.contain('Copy link to post');
                    expect(buttons[1].innerText.trim(), 'context menu button 2').to.contain('Unpublish');
                    expect(buttons[2].innerText.trim(), 'context menu button 3').to.contain('Feature');
                    expect(buttons[3].innerText.trim(), 'context menu button 4').to.contain('Add a tag');
                    expect(buttons[4].innerText.trim(), 'context menu button 5').to.contain('Duplicate');
                });

                // Note: we cover the functionality of the context menu buttons in the 'as admin' section
            });
        });

        describe('as admin', function () {
            let admin, editor, publishedPost, scheduledPost, draftPost, authorPost;

            beforeEach(async function () {
                this.server.loadFixtures('settings');
                this.server.loadFixtures('tiers');

                let adminRole = this.server.create('role', {name: 'Administrator'});
                admin = this.server.create('user', {roles: [adminRole]});
                let editorRole = this.server.create('role', {name: 'Editor'});
                editor = this.server.create('user', {roles: [editorRole]});

                publishedPost = this.server.create('post', {authors: [admin], status: 'published', title: 'Published Post', visibility: 'paid'});
                scheduledPost = this.server.create('post', {authors: [admin], status: 'scheduled', title: 'Scheduled Post'});
                draftPost = this.server.create('post', {authors: [admin], status: 'draft', title: 'Draft Post'});
                authorPost = this.server.create('post', {authors: [editor], status: 'published', title: 'Editor Published Post'});

                // pages shouldn't appear in the list
                this.server.create('page', {authors: [admin], status: 'published', title: 'Published Page'});

                await authenticateSession();
            });

            describe('displays and filter posts', function () {
                it('displays posts', async function () {
                    await visit('/posts');

                    const posts = findAll('[data-test-post-id]');
                    // displays all posts by default (all statuses) [no pages]
                    expect(posts.length, 'all posts count').to.equal(4);

                    // make sure display is scheduled > draft > published/sent
                    expect(posts[0].querySelector('.gh-content-entry-title').textContent, 'post 1 title').to.contain('Scheduled Post');
                    expect(posts[1].querySelector('.gh-content-entry-title').textContent, 'post 2 title').to.contain('Draft Post');
                    expect(posts[2].querySelector('.gh-content-entry-title').textContent, 'post 3 title').to.contain('Published Post');
                    expect(posts[3].querySelector('.gh-content-entry-title').textContent, 'post 4 title').to.contain('Editor Published Post');

                    // check API requests
                    let lastRequests = this.server.pretender.handledRequests.filter(request => request.url.includes('/posts/'));
                    expect(lastRequests[0].queryParams.filter, 'scheduled request filter').to.have.string('status:scheduled');
                    expect(lastRequests[1].queryParams.filter, 'drafts request filter').to.have.string('status:draft');
                    expect(lastRequests[2].queryParams.filter, 'published request filter').to.have.string('status:[published,sent]');
                });

                it('can filter by status', async function () {
                    await visit('/posts');

                    // show draft posts
                    await selectChoose('[data-test-type-select]', 'Draft posts');

                    // API request is correct
                    let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                    expect(lastRequest.queryParams.filter, '"drafts" request status filter').to.have.string('status:draft');
                    // Displays draft post
                    expect(findAll('[data-test-post-id]').length, 'drafts count').to.equal(1);
                    expect(find(`[data-test-post-id="${draftPost.id}"]`), 'draft post').to.exist;

                    // show published posts
                    await selectChoose('[data-test-type-select]', 'Published posts');

                    // API request is correct
                    [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                    expect(lastRequest.queryParams.filter, '"published" request status filter').to.have.string('status:published');
                    // Displays three published posts + pages
                    expect(findAll('[data-test-post-id]').length, 'published count').to.equal(2);
                    expect(find(`[data-test-post-id="${publishedPost.id}"]`), 'admin published post').to.exist;
                    expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author published post').to.exist;

                    // show scheduled posts
                    await selectChoose('[data-test-type-select]', 'Scheduled posts');

                    // API request is correct
                    [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                    expect(lastRequest.queryParams.filter, '"scheduled" request status filter').to.have.string('status:scheduled');
                    // Displays scheduled post
                    expect(findAll('[data-test-post-id]').length, 'scheduled count').to.equal(1);
                    expect(find(`[data-test-post-id="${scheduledPost.id}"]`), 'scheduled post').to.exist;
                });

                it('can filter by author', async function () {
                    await visit('/posts');

                    // show all posts by editor
                    await selectChoose('[data-test-author-select]', editor.name);

                    // API request is correct
                    let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                    expect(lastRequest.queryParams.allFilter, '"editor" request status filter')
                        .to.have.string('status:[draft,scheduled,published,sent]');
                    expect(lastRequest.queryParams.allFilter, '"editor" request filter param')
                        .to.have.string(`authors:${editor.slug}`);

                    // Displays editor post
                    expect(findAll('[data-test-post-id]').length, 'editor count').to.equal(1);
                });

                it('can filter by visibility', async function () {
                    await visit('/posts');

                    await selectChoose('[data-test-visibility-select]', 'Paid members-only');
                    let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                    expect(lastRequest.queryParams.allFilter, '"visibility" request filter param')
                        .to.have.string('visibility:[paid,tiers]');
                    let posts = findAll('[data-test-post-id]');
                    expect(posts.length, 'all posts count').to.equal(1);

                    await selectChoose('[data-test-visibility-select]', 'Public');
                    [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                    expect(lastRequest.queryParams.allFilter, '"visibility" request filter param')
                        .to.have.string('visibility:public');
                    posts = findAll('[data-test-post-id]');
                    expect(posts.length, 'all posts count').to.equal(3);
                });

                it('can filter by tag', async function () {
                    this.server.create('tag', {name: 'B - Second', slug: 'second'});
                    this.server.create('tag', {name: 'Z - Last', slug: 'last'});
                    this.server.create('tag', {name: 'A - First', slug: 'first'});

                    await visit('/posts');
                    await clickTrigger('[data-test-tag-select]');

                    let options = findAll('.ember-power-select-option');

                    // check that dropdown sorts alphabetically
                    expect(options[0].textContent.trim()).to.equal('All tags');
                    expect(options[1].textContent.trim()).to.equal('A - First');
                    expect(options[2].textContent.trim()).to.equal('B - Second');
                    expect(options[3].textContent.trim()).to.equal('Z - Last');

                    // select one
                    await selectChoose('[data-test-tag-select]', 'B - Second');
                    // affirm request
                    let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                    expect(lastRequest.queryParams.allFilter, '"tag" request filter param').to.have.string('tag:second');
                });
            });

            describe('context menu actions', function () {
                describe('single post', function () {
                    it('can duplicate a post', async function () {
                        await visit('/posts');

                        // get the post
                        const post = find(`[data-test-post-id="${publishedPost.id}"]`);
                        expect(post, 'post').to.exist;

                        await triggerEvent(post, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element

                        let buttons = contextMenu.querySelectorAll('button');

                        expect(contextMenu, 'context menu').to.exist;
                        expect(buttons.length, 'context menu buttons').to.equal(6);
                        expect(buttons[0].innerText.trim(), 'context menu button 1').to.contain('Copy link to post');
                        expect(buttons[1].innerText.trim(), 'context menu button 1').to.contain('Unpublish');
                        expect(buttons[2].innerText.trim(), 'context menu button 2').to.contain('Feature'); // or Unfeature
                        expect(buttons[3].innerText.trim(), 'context menu button 3').to.contain('Add a tag');
                        expect(buttons[4].innerText.trim(), 'context menu button 4').to.contain('Duplicate');
                        expect(buttons[5].innerText.trim(), 'context menu button 5').to.contain('Delete');

                        // duplicate the post
                        await click(buttons[4]);

                        const posts = findAll('[data-test-post-id]');
                        expect(posts.length, 'all posts count').to.equal(5);
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.url, 'request url').to.match(new RegExp(`/posts/${publishedPost.id}/copy/`));
                    });

                    it('can copy a post link', async function () {
                        sinon.stub(navigator.clipboard, 'writeText').resolves();

                        await visit('/posts');

                        // get the post
                        const post = find(`[data-test-post-id="${publishedPost.id}"]`);
                        expect(post, 'post').to.exist;

                        await triggerEvent(post, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element

                        let buttons = contextMenu.querySelectorAll('button');

                        expect(contextMenu, 'context menu').to.exist;
                        expect(buttons.length, 'context menu buttons').to.equal(6);
                        expect(buttons[0].innerText.trim(), 'context menu button 1').to.contain('Copy link to post');
                        expect(buttons[1].innerText.trim(), 'context menu button 1').to.contain('Unpublish');
                        expect(buttons[2].innerText.trim(), 'context menu button 2').to.contain('Feature'); // or Unfeature
                        expect(buttons[3].innerText.trim(), 'context menu button 3').to.contain('Add a tag');
                        expect(buttons[4].innerText.trim(), 'context menu button 4').to.contain('Duplicate');
                        expect(buttons[5].innerText.trim(), 'context menu button 5').to.contain('Delete');

                        // Copy the post link
                        await click(buttons[0]);

                        // Check that the notification is displayed
                        expect(find('[data-test-text="notification-content"]')).to.contain.text('Post link copied');

                        // Check that the clipboard contains the right content
                        expect(navigator.clipboard.writeText.calledOnce).to.be.true;
                        expect(navigator.clipboard.writeText.firstCall.args[0]).to.equal(`http://localhost:4200/${publishedPost.slug}/`);
                    });

                    it('can copy a preview link', async function () {
                        sinon.stub(navigator.clipboard, 'writeText').resolves();

                        await visit('/posts');

                        // get the post
                        const post = find(`[data-test-post-id="${draftPost.id}"]`);
                        expect(post, 'post').to.exist;

                        await triggerEvent(post, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element

                        let buttons = contextMenu.querySelectorAll('button');

                        expect(contextMenu, 'context menu').to.exist;
                        expect(buttons.length, 'context menu buttons').to.equal(5);
                        expect(buttons[0].innerText.trim(), 'context menu button 1').to.contain('Copy preview link');
                        expect(buttons[1].innerText.trim(), 'context menu button 2').to.contain('Feature'); // or Unfeature
                        expect(buttons[2].innerText.trim(), 'context menu button 3').to.contain('Add a tag');
                        expect(buttons[3].innerText.trim(), 'context menu button 4').to.contain('Duplicate');
                        expect(buttons[4].innerText.trim(), 'context menu button 5').to.contain('Delete');

                        // Copy the preview link
                        await click(buttons[0]);

                        // Check that the notification is displayed
                        expect(find('[data-test-text="notification-content"]')).to.contain.text('Preview link copied');

                        // Check that the clipboard contains the right content
                        expect(navigator.clipboard.writeText.calledOnce).to.be.true;
                        expect(navigator.clipboard.writeText.firstCall.args[0]).to.equal(`http://localhost:4200/p/${draftPost.uuid}/`);
                    });
                });

                describe('multiple posts', function () {
                    it('can feature and unfeature', async function () {
                        await visit('/posts');

                        // get all posts
                        const posts = findAll('[data-test-post-id]');
                        expect(posts.length, 'all posts count').to.equal(4);

                        const postThreeContainer = posts[2].parentElement; // draft post
                        const postFourContainer = posts[3].parentElement; // published post

                        await click(postThreeContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        await click(postFourContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});

                        expect(postFourContainer.getAttribute('data-selected'), 'postFour selected').to.exist;
                        expect(postThreeContainer.getAttribute('data-selected'), 'postThree selected').to.exist;

                        // NOTE: right clicks don't seem to work in these tests
                        //  contextmenu is the event triggered - https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event
                        await triggerEvent(postFourContainer, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        expect(contextMenu, 'context menu').to.exist;

                        // feature the post
                        let buttons = contextMenu.querySelectorAll('button');
                        let featureButton = findButton('Feature', buttons);
                        expect(featureButton, 'feature button').to.exist;
                        await click(featureButton);

                        // API request is correct - note, we don't mock the actual model updates
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.queryParams.filter, 'feature request id').to.equal(`id:['${publishedPost.id}','${authorPost.id}']`);
                        expect(JSON.parse(lastRequest.requestBody).bulk.action, 'feature request action').to.equal('feature');

                        // ensure ui shows these are now featured
                        expect(postThreeContainer.querySelector('.gh-featured-post'), 'postFour featured').to.exist;
                        expect(postFourContainer.querySelector('.gh-featured-post'), 'postFour featured').to.exist;

                        // unfeature the posts
                        await triggerEvent(postFourContainer, 'contextmenu');

                        contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        expect(contextMenu, 'context menu').to.exist;

                        // unfeature the posts
                        buttons = contextMenu.querySelectorAll('button');
                        featureButton = findButton('Unfeature', buttons);
                        expect(featureButton, 'unfeature button').to.exist;
                        await click(featureButton);

                        // API request is correct - note, we don't mock the actual model updates
                        [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.queryParams.filter, 'unfeature request id').to.equal(`id:['${publishedPost.id}','${authorPost.id}']`);
                        expect(JSON.parse(lastRequest.requestBody).bulk.action, 'unfeature request action').to.equal('unfeature');

                        // ensure ui shows these are now unfeatured
                        expect(postThreeContainer.querySelector('.gh-featured-post'), 'postFour featured').to.not.exist;
                        expect(postFourContainer.querySelector('.gh-featured-post'), 'postFour featured').to.not.exist;
                    });

                    it('can add a tag', async function () {
                        await visit('/posts');

                        // get all posts
                        const posts = findAll('[data-test-post-id]');
                        expect(posts.length, 'all posts count').to.equal(4);

                        const postThreeContainer = posts[2].parentElement; // draft post
                        const postFourContainer = posts[3].parentElement; // published post

                        await click(postThreeContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        await click(postFourContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});

                        expect(postFourContainer.getAttribute('data-selected'), 'postFour selected').to.exist;
                        expect(postThreeContainer.getAttribute('data-selected'), 'postThree selected').to.exist;

                        // NOTE: right clicks don't seem to work in these tests
                        //  contextmenu is the event triggered - https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event
                        await triggerEvent(postFourContainer, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        expect(contextMenu, 'context menu').to.exist;

                        // add a tag to the posts
                        let buttons = contextMenu.querySelectorAll('button');
                        let addTagButton = findButton('Add a tag', buttons);
                        expect(addTagButton, 'add tag button').to.exist;
                        await click(addTagButton);

                        const addTagsModal = find('[data-test-modal="add-tags"]');
                        expect(addTagsModal, 'tag settings modal').to.exist;

                        const input = addTagsModal.querySelector('input');
                        expect(input, 'tag input').to.exist;
                        await fillIn(input, 'test-tag');
                        await triggerKeyEvent(input, 'keydown', 13);
                        await click('[data-test-button="confirm"]');

                        // API request is correct - note, we don't mock the actual model updates
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-2);
                        expect(lastRequest.queryParams.filter, 'add tag request id').to.equal(`id:['${publishedPost.id}','${authorPost.id}']`);
                        expect(JSON.parse(lastRequest.requestBody).bulk.action, 'add tag request action').to.equal('addTag');
                    });

                    it('cannot change access when members is disabled', async function () {
                        await visit('/posts');

                        const settingsService = this.owner.lookup('service:settings');
                        await settingsService.set('membersEnabled', false);

                        // get all posts
                        const posts = findAll('[data-test-post-id]');
                        expect(posts.length, 'all posts count').to.equal(4);

                        const postThreeContainer = posts[2].parentElement; // published post
                        const postFourContainer = posts[3].parentElement; // author post

                        await click(postThreeContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        await click(postFourContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        await triggerEvent(postFourContainer, 'contextmenu');

                        expect(find('[data-test-post-context-menu]'), 'context menu').to.exist;
                        expect(find('[data-test-post-context-menu] [data-test-button="change-access"]'), 'change access button').not.to.exist;
                    });

                    it('can change access', async function () {
                        await visit('/posts');

                        const settingsService = this.owner.lookup('service:settings');
                        await settingsService.set('membersEnabled', true);

                        let posts = findAll('[data-test-post-id]');
                        let postThreeContainer = posts[2].parentElement; // published post
                        let postFourContainer = posts[3].parentElement; // author post

                        await click(postThreeContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        await click(postFourContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});

                        await triggerEvent(postFourContainer, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        let buttons = contextMenu.querySelectorAll('button');
                        let changeAccessButton = findButton('Change access', buttons);

                        await click(changeAccessButton);

                        let changeAccessModal = find('[data-test-modal="edit-posts-access"]');
                        let selectElement = changeAccessModal.querySelector('select');
                        await fillIn(selectElement, 'members');
                        await click('[data-test-button="confirm"]');

                        // check API request
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.queryParams.filter, 'change access request id').to.equal(`id:['${publishedPost.id}','${authorPost.id}']`);
                        expect(JSON.parse(lastRequest.requestBody).bulk.action, 'change access request action').to.equal('access');

                        // ensure modal matches the new state when accessed again
                        // NOTE: we only show the selected visibility/tiers state for single selections
                        await click(postThreeContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        postFourContainer = findAll('[data-test-post-id]')[3].parentElement; // published post
                        await triggerEvent(postFourContainer, 'contextmenu');
                        contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        buttons = contextMenu.querySelectorAll('button');
                        changeAccessButton = findButton('Change access', buttons);
                        await click(changeAccessButton);
                        changeAccessModal = find('[data-test-modal="edit-posts-access"]');
                        selectElement = changeAccessModal.querySelector('select');
                        expect(selectElement, 'access select value after changing').to.have.value('members');
                        await click(changeAccessModal.querySelector('[data-test-button="cancel"]'));

                        // ensure creating new posts still works
                        // (we had a bug where newly created records in the store had `isNew: false` set meaning any saves failed
                        // because Ember Data attempted a PUT with no id)
                        sinon.stub(windowProxy, 'reload'); // we had a force-reload in place to workaround the bug
                        await visit('/editor/post');
                        await fillIn('[data-test-editor-title-input]', 'New post');
                        await blur('[data-test-editor-title-input]');
                        expect(this.server.db.posts.length, 'posts count after new post save').to.equal(5);
                    });

                    it('can change access with custom tiers', async function () {
                        await visit('/posts');

                        const settingsService = this.owner.lookup('service:settings');
                        await settingsService.set('membersEnabled', true);

                        const postContainer = findAll('[data-test-post-id]')[2].parentElement; // published post
                        await triggerEvent(postContainer, 'contextmenu');
                        await click('[data-test-post-context-menu] [data-test-button="change-access"]');

                        const modalSelector = '[data-test-modal="edit-posts-access"]';
                        const tiersSelector = `${modalSelector} [data-test-visibility-segment-select]`;

                        expect(find(tiersSelector)).not.to.exist;
                        await fillIn(`${modalSelector} select`, 'tiers');
                        expect(find(tiersSelector)).to.exist;
                        expect(findAll(`${tiersSelector} [data-test-visibility-segment-option]`)).to.have.length(0);

                        await clickTrigger(tiersSelector);
                        await selectChoose(tiersSelector, 'Default Tier');
                        await click(`${modalSelector} [data-test-button="confirm"]`);

                        // check API request
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.queryParams.filter, 'change access request id').to.equal(`id:['${publishedPost.id}']`);
                        expect(JSON.parse(lastRequest.requestBody).bulk.action, 'change access request action').to.equal('access');
                        expect(JSON.parse(lastRequest.requestBody).bulk.meta.visibility, 'change access request visibility').to.equal('tiers');
                        expect(JSON.parse(lastRequest.requestBody).bulk.meta.tiers[0].id, 'change access request tier').to.equal(this.server.schema.tiers.findBy({slug: 'default-tier'}).id);

                        // check correct data is shown when re-accessing change access modal
                        await triggerEvent(postContainer, 'contextmenu');
                        await click('[data-test-post-context-menu] [data-test-button="change-access"]');
                        expect(find(`${modalSelector} select`).value).to.equal('tiers');
                        expect(findAll(`${tiersSelector} [data-test-visibility-segment-option]`)).to.have.length(1);
                        expect(find(`${tiersSelector} [data-test-visibility-segment-option]`).textContent.trim()).to.equal('Default Tier');
                    });

                    it('can unpublish', async function () {
                        await visit('/posts');

                        // get all posts
                        const posts = findAll('[data-test-post-id]');
                        expect(posts.length, 'all posts count').to.equal(4);

                        const postThreeContainer = posts[2].parentElement; // draft post
                        const postFourContainer = posts[3].parentElement; // published post

                        await click(postThreeContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        await click(postFourContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});

                        expect(postFourContainer.getAttribute('data-selected'), 'postFour selected').to.exist;
                        expect(postThreeContainer.getAttribute('data-selected'), 'postThree selected').to.exist;

                        // NOTE: right clicks don't seem to work in these tests
                        //  contextmenu is the event triggered - https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event
                        await triggerEvent(postFourContainer, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        expect(contextMenu, 'context menu').to.exist;

                        // unpublish the posts
                        let buttons = contextMenu.querySelectorAll('button');
                        let unpublishButton = findButton('Unpublish', buttons);
                        expect(unpublishButton, 'unpublish button').to.exist;
                        await click(unpublishButton);

                        // handle modal
                        const modal = find('[data-test-modal="unpublish-posts"]');
                        expect(modal, 'unpublish modal').to.exist;
                        await click('[data-test-button="confirm"]');

                        // API request is correct - note, we don't mock the actual model updates
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.queryParams.filter, 'unpublish request id').to.equal(`id:['${publishedPost.id}','${authorPost.id}']`);
                        expect(JSON.parse(lastRequest.requestBody).bulk.action, 'unpublish request action').to.equal('unpublish');

                        // ensure ui shows these are now unpublished
                        expect(postThreeContainer.querySelector('.gh-content-entry-status').textContent, 'postThree status').to.contain('Draft');
                        expect(postFourContainer.querySelector('.gh-content-entry-status').textContent, 'postThree status').to.contain('Draft');
                    });

                    it('can unschedule', async function () {
                        await visit('/posts');

                        // get all posts
                        const posts = findAll('[data-test-post-id]');
                        expect(posts.length, 'all posts count').to.equal(4);

                        const postOneContainer = posts[0].parentElement; // scheduled post

                        await click(postOneContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});

                        expect(postOneContainer.getAttribute('data-selected'), 'postOne selected').to.exist;

                        // NOTE: right clicks don't seem to work in these tests
                        //  contextmenu is the event triggered - https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event
                        await triggerEvent(postOneContainer, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        expect(contextMenu, 'context menu').to.exist;

                        // unschedule the post
                        let buttons = contextMenu.querySelectorAll('button');
                        let unscheduleButton = findButton('Unschedule', buttons);
                        expect(unscheduleButton, 'unschedule button').to.exist;
                        await click(unscheduleButton);

                        // handle modal
                        const modal = find('[data-test-modal="unschedule-posts"]');
                        expect(modal, 'unschedule modal').to.exist;
                        await click('[data-test-button="confirm"]');

                        // API request is correct - note, we don't mock the actual model updates
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.queryParams.filter, 'unschedule request id').to.equal(`id:['${scheduledPost.id}']`);
                        expect(JSON.parse(lastRequest.requestBody).bulk.action, 'unschedule request action').to.equal('unschedule');

                        // ensure ui shows these are now unpublished
                        expect(postOneContainer.querySelector('.gh-content-entry-status').textContent, 'postOne status').to.contain('Draft');
                    });

                    it('can delete', async function () {
                        await visit('/posts');

                        // get all posts
                        const posts = findAll('[data-test-post-id]');
                        expect(posts.length, 'all posts count').to.equal(4);

                        const postThreeContainer = posts[2].parentElement; // draft post
                        const postFourContainer = posts[3].parentElement; // published post

                        await click(postThreeContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});
                        await click(postFourContainer, {metaKey: ctrlOrCmd === 'command', ctrlKey: ctrlOrCmd === 'ctrl'});

                        expect(postFourContainer.getAttribute('data-selected'), 'postFour selected').to.exist;
                        expect(postThreeContainer.getAttribute('data-selected'), 'postThree selected').to.exist;

                        // NOTE: right clicks don't seem to work in these tests
                        //  contextmenu is the event triggered - https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event
                        await triggerEvent(postFourContainer, 'contextmenu');

                        let contextMenu = find('.gh-posts-context-menu'); // this is a <ul> element
                        expect(contextMenu, 'context menu').to.exist;

                        // delete the posts
                        let buttons = contextMenu.querySelectorAll('button');
                        let deleteButton = findButton('Delete', buttons);
                        expect(deleteButton, 'delete button').to.exist;
                        await click(deleteButton);

                        // handle modal
                        const modal = find('[data-test-modal="delete-posts"]');
                        expect(modal, 'delete modal').to.exist;
                        await click('[data-test-button="confirm"]');

                        // API request is correct - note, we don't mock the actual model updates
                        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                        expect(lastRequest.queryParams.filter, 'delete request id').to.equal(`id:['${publishedPost.id}','${authorPost.id}']`);
                        expect(lastRequest.method, 'delete request method').to.equal('DELETE');

                        // ensure ui shows these are now deleted
                        expect(findAll('[data-test-post-id]').length, 'all posts count').to.equal(2);
                    });
                });
            });
            it('can add and edit custom views', async function () {
                // actions are not visible when there's no filter
                await visit('/posts');
                expect(find('[data-test-button="edit-view"]'), 'edit-view button (no filter)').to.not.exist;
                expect(find('[data-test-button="add-view"]'), 'add-view button (no filter)').to.not.exist;

                // add action is visible after filtering to a non-default filter
                await selectChoose('[data-test-author-select]', admin.name);
                expect(find('[data-test-button="add-view"]'), 'add-view button (with filter)').to.exist;

                // adding view shows it in the sidebar
                await click('[data-test-button="add-view"]'), 'add-view button';
                expect(find('[data-test-modal="custom-view-form"]'), 'custom view modal (on add)').to.exist;
                expect(find('[data-test-modal="custom-view-form"] h1').textContent.trim()).to.equal('New view');
                await fillIn('[data-test-input="custom-view-name"]', 'Test view');
                await click('[data-test-button="save-custom-view"]');
                // modal closes on save
                expect(find('[data-test-modal="custom-view-form"]'), 'custom view modal (after add save)').to.not.exist;
                // UI updates
                expect(find('[data-test-nav-custom="posts-Test view"]'), 'new view nav').to.exist;
                expect(find('[data-test-nav-custom="posts-Test view"]').textContent.trim()).to.equal('Test view');
                expect(find('[data-test-button="add-view"]'), 'add-view button (on existing view)').to.not.exist;
                expect(find('[data-test-button="edit-view"]'), 'edit-view button (on existing view)').to.exist;

                // editing view
                await click('[data-test-button="edit-view"]'), 'edit-view button';
                expect(find('[data-test-modal="custom-view-form"]'), 'custom view modal (on edit)').to.exist;
                expect(find('[data-test-modal="custom-view-form"] h1').textContent.trim()).to.equal('Edit view');
                await fillIn('[data-test-input="custom-view-name"]', 'Updated view');
                await click('[data-test-button="save-custom-view"]');
                // modal closes on save
                expect(find('[data-test-modal="custom-view-form"]'), 'custom view modal (after edit save)').to.not.exist;
                // UI updates
                expect(find('[data-test-nav-custom="posts-Updated view"]')).to.exist;
                expect(find('[data-test-nav-custom="posts-Updated view"]').textContent.trim()).to.equal('Updated view');
                expect(find('[data-test-button="add-view"]'), 'add-view button (after edit)').to.not.exist;
                expect(find('[data-test-button="edit-view"]'), 'edit-view button (after edit)').to.exist;
            });

            it('can navigate to custom views', async function () {
                this.server.schema.settings.findBy({key: 'shared_views'}).update({
                    group: 'site',
                    key: 'shared_views',
                    value: JSON.stringify([{
                        route: 'posts',
                        name: 'My posts',
                        filter: {
                            author: admin.slug
                        }
                    }])
                });

                await visit('/posts');

                // nav bar contains default + custom views
                expect(find('[data-test-nav-custom="posts-Drafts"]'), 'drafts nav').to.exist;
                expect(find('[data-test-nav-custom="posts-Scheduled"]'), 'scheduled nav').to.exist;
                expect(find('[data-test-nav-custom="posts-Published"]'), 'published nav').to.exist;
                expect(find('[data-test-nav-custom="posts-My posts"]'), 'my posts nav').to.exist;

                // screen has default title and sidebar is showing inactive custom view
                expect(find('[data-test-screen-title]')).to.have.rendered.trimmed.text('Posts');
                expect(find('[data-test-nav="posts"]')).to.have.class('active');

                // clicking sidebar custom view link works
                await click('[data-test-nav-custom="posts-Scheduled"]');
                expect(currentURL()).to.equal('/posts?type=scheduled');
                expect(find('[data-test-screen-title]').innerText).to.match(/Scheduled/);
                expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active');

                // clicking the main posts link resets
                await click('[data-test-nav="posts"]');
                expect(currentURL()).to.equal('/posts');
                expect(find('[data-test-screen-title]')).to.have.rendered.trimmed.text('Posts');
                expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.not.have.class('active');

                // changing a filter to match a custom view shows custom view
                await selectChoose('[data-test-type-select]', 'Scheduled posts');
                expect(currentURL()).to.equal('/posts?type=scheduled');
                expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active');
                expect(find('[data-test-screen-title]').innerText).to.match(/Scheduled/);
            });

            it('Shows edit view if order is null, which indicates a bad state', async function () {
                this.server.schema.settings.findBy({key: 'shared_views'}).update({
                    group: 'site',
                    key: 'shared_views',
                    value: JSON.stringify([{
                        route: 'posts',
                        name: 'My posts',
                        filter: {
                            author: admin.slug,
                            order: null
                        }
                    }])
                });

                await visit('/posts');
                expect(find('[data-test-nav-custom="posts-My posts"]'), 'my posts nav').to.exist;
                // click on the custom view
                await click('[data-test-nav-custom="posts-My posts"]');
                expect(find('[data-test-button="edit-view"]'), 'edit-view button (on existing view)').to.exist;
            });
        });
    });

    // NOTE: Because the pages list is (at this point in time) a thin extension of the posts list, we should not need to duplicate all of the tests.
    //  The main difference is that we fetch pages, not posts.
    //  IF we implement any kind of functionality that *is* specific to a post or page and differentiate these models further, we will need to add tests then.
    describe('pages', function () {
        describe('as admin', function () {
            let admin, editor;

            beforeEach(async function () {
                let adminRole = this.server.create('role', {name: 'Administrator'});
                admin = this.server.create('user', {roles: [adminRole]});
                let editorRole = this.server.create('role', {name: 'Editor'});
                editor = this.server.create('user', {roles: [editorRole]});

                // posts shouldn't show in the pages list
                // TODO: figure out why we need post counts to be >= page count for mirage to work right
                this.server.create('post', {authors: [admin], status: 'published', title: 'Published Post', visibility: 'paid'});
                this.server.create('post', {authors: [admin], status: 'published', title: 'Published Post', visibility: 'paid'});
                this.server.create('post', {authors: [admin], status: 'published', title: 'Published Post', visibility: 'paid'});
                this.server.create('post', {authors: [admin], status: 'published', title: 'Published Post', visibility: 'paid'});

                this.server.create('page', {authors: [admin], status: 'published', title: 'Published Page'});
                this.server.create('page', {authors: [editor], status: 'published', title: 'Editor Published Page'});
                this.server.create('page', {authors: [admin], status: 'draft', title: 'Draft Page'});
                this.server.create('page', {authors: [admin], status: 'scheduled', title: 'Scheduled Page'});

                await authenticateSession();
            });

            it('can view pages', async function () {
                await visit('/pages');

                const pages = findAll('[data-test-post-id]');
                // displays all pages by default (all statuses)
                expect(pages.length, 'all pages count').to.equal(4);
            });

            it('can filter pages', async function () {
                await visit('/pages');

                // show draft pages
                await selectChoose('[data-test-type-select]', 'Draft pages');

                // API request is correct
                let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter, '"drafts" request status filter').to.have.string('status:draft');
                // Displays draft page
                expect(findAll('[data-test-post-id]').length, 'drafts count').to.equal(1);
                expect(find('[data-test-post-id="3"]'), 'draft page').to.exist;

                // show published pages
                await selectChoose('[data-test-type-select]', 'Published pages');

                // API request is correct
                [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter, '"published" request status filter').to.have.string('status:published');
                // Displays two published pages
                expect(findAll('[data-test-post-id]').length, 'published count').to.equal(2);
                expect(find('[data-test-post-id="1"]'), 'admin published page').to.exist;
                expect(find('[data-test-post-id="2"]'), 'editor published page').to.exist;

                // show scheduled pages
                await selectChoose('[data-test-type-select]', 'Scheduled pages');

                // API request is correct
                [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter, '"scheduled" request status filter').to.have.string('status:scheduled');
                // Displays scheduled page
                expect(findAll('[data-test-post-id]').length, 'scheduled count').to.equal(1);
                expect(find('[data-test-post-id="4"]'), 'scheduled page').to.exist;
            });
        });
    });
});
