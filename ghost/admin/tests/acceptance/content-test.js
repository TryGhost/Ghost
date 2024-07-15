import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find, findAll, triggerEvent, visit} from '@ember/test-helpers';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe.only('Acceptance: Content', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');
    });

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/posts');

        expect(currentURL()).to.equal('/signin');
    });

    describe('as admin', function () {
        let admin, editor, publishedPost, scheduledPost, draftPost, authorPost;

        beforeEach(async function () {
            let adminRole = this.server.create('role', {name: 'Administrator'});
            admin = this.server.create('user', {roles: [adminRole]});
            let editorRole = this.server.create('role', {name: 'Editor'});
            editor = this.server.create('user', {roles: [editorRole]});

            publishedPost = this.server.create('post', {authors: [admin], status: 'published', title: 'Published Post'});
            scheduledPost = this.server.create('post', {authors: [admin], status: 'scheduled', title: 'Scheduled Post'});
            draftPost = this.server.create('post', {authors: [admin], status: 'draft', title: 'Draft Post'});
            authorPost = this.server.create('post', {authors: [editor], status: 'published', title: 'Editor Published Post'});

            // pages shouldn't appear in the list
            this.server.create('page', {authors: [admin], status: 'published', title: 'Published Page'});

            return await authenticateSession();
        });

        describe('displays and filter posts', function () {
            it('displays posts', async function () {
                await visit('/posts');

                const posts = findAll('[data-test-post-id]');
                // displays all posts by default (all statuses) [no pages]
                expect(posts.length, 'all posts count').to.equal(4);

                // note: atm the mirage backend doesn't support ordering of the results set
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
    
                // show all posts
                await selectChoose('[data-test-type-select]', 'All posts');
    
                // API request is correct
                [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter, '"all" request status filter').to.have.string('status:[draft,scheduled,published,sent]');
            });

            it('can filter by author', async function () {
                await visit('/posts');

                // show all posts by editor
                await selectChoose('[data-test-author-select]', editor.name);

                // API request is correct
                let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter, '"editor" request status filter')
                    .to.have.string('status:[draft,scheduled,published,sent]');
                expect(lastRequest.queryParams.filter, '"editor" request filter param')
                    .to.have.string(`authors:${editor.slug}`);
            });

            it('can filter by visibility', async function () {
                await visit('/posts');

                await selectChoose('[data-test-visibility-select]', 'Paid members-only');

                let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter, '"visibility" request filter param')
                    .to.have.string('visibility:[paid,tiers]+status:[draft,scheduled,published,sent]');
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
                expect(lastRequest.queryParams.filter, 'request filter').to.have.string('tag:second');
            });
        });

        it.only('can perform bulk actions', async function () {
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

            let buttons = contextMenu.querySelectorAll('button');

            // should have four options for a published post
            expect(contextMenu, 'context menu').to.exist;
            expect(buttons.length, 'context menu buttons').to.equal(4);
            expect(buttons[0].innerText.trim(), 'context menu button 1').to.contain('Unpublish');
            expect(buttons[1].innerText.trim(), 'context menu button 2').to.contain('Feature');
            expect(buttons[2].innerText.trim(), 'context menu button 3').to.contain('Add a tag');
            expect(buttons[3].innerText.trim(), 'context menu button 4').to.contain('Delete');

            // feature the post
            await click(buttons[1]);

            // API request is correct - note, we don't mock the actual model updates
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, 'feature request id').to.equal(`id:['3','4']`);
            expect(JSON.parse(lastRequest.requestBody).bulk.action, 'feature request action').to.equal('feature');
            
            // ensure ui shows these are now featured
            expect(postThreeContainer.querySelector('.gh-featured-post'), 'postFour featured').to.exist;
            expect(postFourContainer.querySelector('.gh-featured-post'), 'postFour featured').to.exist;

            // unpublish the post
            await triggerEvent(postFourContainer, 'contextmenu');

            contextMenu = find('.gh-posts-context-menu');
            buttons = contextMenu.querySelectorAll('button');

            // should show unfeature option
            expect(buttons.length, 'context menu buttons').to.equal(4);
            expect(buttons[0].innerText.trim(), 'context menu button 1').to.contain('Unpublish');
            expect(buttons[1].innerText.trim(), 'context menu button 1').to.contain('Unfeature');

            // unpublish post
            await click(buttons[0]);
            await click('[data-test-button="confirm"]');

            // await this.pauseTest();

            // API request is correct
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, 'unpublish request id').to.contain(`id:['3','4']`);
            expect(JSON.parse(lastRequest.requestBody).bulk.action, 'unpublish request action').to.equal('unpublish');

            // ensure ui shows these are now unpublished
            // gh-content-entry-status shows status
            expect(postThreeContainer.querySelector('.gh-content-entry-status').textContent.trim(), 'postFour status').to.equal('Draft');
            expect(postFourContainer.querySelector('.gh-content-entry-status').textContent.trim(), 'postFour status').to.equal('Draft');
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
            this.server.create('setting', {
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
            expect(find('[data-test-nav-custom="posts-Drafts"]')).to.exist;
            expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.exist;
            expect(find('[data-test-nav-custom="posts-Published"]')).to.exist;
            expect(find('[data-test-nav-custom="posts-My posts"]')).to.exist;

            // screen has default title and sidebar is showing inactive custom view
            expect(find('[data-test-screen-title]')).to.have.rendered.text('Posts');
            expect(find('[data-test-nav="posts"]')).to.have.class('active');

            // clicking sidebar custom view link works
            await click('[data-test-nav-custom="posts-Scheduled"]');
            expect(currentURL()).to.equal('/posts?type=scheduled');
            expect(find('[data-test-screen-title]').innerText).to.match(/Scheduled/);
            expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active');

            // clicking the main posts link resets
            await click('[data-test-nav="posts"]');
            expect(currentURL()).to.equal('/posts');
            expect(find('[data-test-screen-title]')).to.have.rendered.text('Posts');
            expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.not.have.class('active');

            // changing a filter to match a custom view shows custom view
            await selectChoose('[data-test-type-select]', 'Scheduled posts');
            expect(currentURL()).to.equal('/posts?type=scheduled');
            expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active');
            expect(find('[data-test-screen-title]').innerText).to.match(/Scheduled/);
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

            return await authenticateSession();
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
    });

    describe('as contributor', function () {
        beforeEach(async function () {
            let contributorRole = this.server.create('role', {name: 'Contributor'});
            this.server.create('user', {roles: [contributorRole]});

            return await authenticateSession();
        });

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
    });
});
