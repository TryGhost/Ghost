import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentURL, fillIn, find, findAll, settled, visit} from '@ember/test-helpers';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Content', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

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

        it('displays and filters posts', async function () {
            await visit('/posts');
            // Not checking request here as it won't be the last request made
            // Displays all posts + pages
            expect(findAll('[data-test-post-id]').length, 'all posts count').to.equal(4);

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
            expect(lastRequest.queryParams.filter, '"all" request status filter').to.have.string('status:[draft,scheduled,published]');

            // show all posts by editor
            await selectChoose('[data-test-author-select]', editor.name);

            // API request is correct
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"editor" request status filter')
                .to.have.string('status:[draft,scheduled,published]');
            expect(lastRequest.queryParams.filter, '"editor" request filter param')
                .to.have.string(`authors:${editor.slug}`);

            // Post status is only visible when members is enabled
            expect(find('[data-test-visibility-select]'), 'access dropdown before members enabled').to.not.exist;
            let featureService = this.owner.lookup('service:feature');
            featureService.set('members', true);
            await settled();
            expect(find('[data-test-visibility-select]'), 'access dropdown after members enabled').to.exist;

            await selectChoose('[data-test-visibility-select]', 'Paid members-only');
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"visibility" request filter param')
                .to.have.string('visibility:paid+status:[draft,scheduled,published]');

            // Displays editor post
            // TODO: implement "filter" param support and fix mirage post->author association
            // expect(find('[data-test-post-id]').length, 'editor post count').to.equal(1);
            // expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author post').to.exist;

            // TODO: test tags dropdown
        });

        // TODO: skipped due to consistently random failures on Travis
        // options[0] is undefined
        // https://github.com/TryGhost/Ghost/issues/10308
        it.skip('sorts tags filter alphabetically', async function () {
            this.server.create('tag', {name: 'B - Second', slug: 'second'});
            this.server.create('tag', {name: 'Z - Last', slug: 'last'});
            this.server.create('tag', {name: 'A - First', slug: 'first'});

            await visit('/posts');
            await clickTrigger('[data-test-tag-select]');

            let options = findAll('.ember-power-select-option');

            expect(options[0].textContent.trim()).to.equal('All tags');
            expect(options[1].textContent.trim()).to.equal('A - First');
            expect(options[2].textContent.trim()).to.equal('B - Second');
            expect(options[3].textContent.trim()).to.equal('Z - Last');
        });

        it('can add and edit custom views', async function () {
            // actions are not visible when there's no filter
            await visit('/posts');
            expect(find('[data-test-button="edit-view"]')).to.not.exist;
            expect(find('[data-test-button="add-view"]')).to.not.exist;

            // add action is visible after filtering to a non-default filter
            await selectChoose('[data-test-author-select]', admin.name);
            expect(find('[data-test-button="add-view"]')).to.exist;

            // adding view shows it in the sidebar
            await click('[data-test-button="add-view"]');
            expect(find('[data-test-modal="custom-view-form"]')).to.exist;
            expect(find('[data-test-modal="custom-view-form"] h1').textContent.trim()).to.equal('New view');
            await fillIn('[data-test-input="custom-view-name"]', 'Test view');
            await click('[data-test-button="save-custom-view"]');
            // modal closes on save
            expect(find('[data-test-modal="custom-view-form"]')).to.not.exist;
            // UI updates
            expect(find('[data-test-nav-custom="posts-Test view"]')).to.exist;
            expect(find('[data-test-nav-custom="posts-Test view"]').textContent.trim()).to.equal('Test view');
            expect(find('[data-test-button="add-view"]')).to.not.exist;
            expect(find('[data-test-button="edit-view"]')).to.exist;

            // editing view
            await click('[data-test-button="edit-view"]');
            expect(find('[data-test-modal="custom-view-form"]')).to.exist;
            expect(find('[data-test-modal="custom-view-form"] h1').textContent.trim()).to.equal('Edit view');
            await fillIn('[data-test-input="custom-view-name"]', 'Updated view');
            await click('[data-test-button="save-custom-view"]');
            // modal closes on save
            expect(find('[data-test-modal="custom-view-form"]')).to.not.exist;
            // UI updates
            expect(find('[data-test-nav-custom="posts-Updated view"]')).to.exist;
            expect(find('[data-test-nav-custom="posts-Updated view"]').textContent.trim()).to.equal('Updated view');
            expect(find('[data-test-button="add-view"]')).to.not.exist;
            expect(find('[data-test-button="edit-view"]')).to.exist;
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
            expect(find('[data-test-nav-custom="posts-Drafts"')).to.exist;
            expect(find('[data-test-nav-custom="posts-Scheduled"')).to.exist;
            expect(find('[data-test-nav-custom="posts-Published"')).to.exist;
            expect(find('[data-test-nav-custom="posts-My posts"')).to.exist;

            // screen has default title and sidebar is showing inactive custom view
            expect(find('[data-test-screen-title]').textContent.trim()).to.equal('Posts');
            expect(find('[data-test-nav="posts"')).to.have.class('active');

            // clicking sidebar custom view link works
            await click('[data-test-nav-custom="posts-Scheduled"]');
            expect(currentURL()).to.equal('/posts?type=scheduled');
            expect(find('[data-test-screen-title]').textContent.trim()).to.match(/Posts[ \n]+Scheduled/);
            expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active');

            // clicking the main posts link resets
            await click('[data-test-nav="posts"]');
            expect(currentURL()).to.equal('/posts');
            expect(find('[data-test-screen-title]').textContent.trim()).to.equal('Posts');
            expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.not.have.class('active');

            // changing a filter to match a custom view shows custom view
            await selectChoose('[data-test-type-select]', 'Scheduled posts');
            expect(currentURL()).to.equal('/posts?type=scheduled');
            expect(find('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active');
            expect(find('[data-test-screen-title]').textContent.trim()).to.match(/Posts[ \n]+Scheduled/);
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
        let contributor, contributorPost;

        beforeEach(async function () {
            let contributorRole = this.server.create('role', {name: 'Contributor'});
            contributor = this.server.create('user', {roles: [contributorRole]});
            let adminRole = this.server.create('role', {name: 'Administrator'});
            let admin = this.server.create('user', {roles: [adminRole]});

            // Create posts
            contributorPost = this.server.create('post', {authors: [contributor], status: 'draft', title: 'Contributor Post Draft'});
            this.server.create('post', {authors: [contributor], status: 'published', title: 'Contributor Published Post'});
            this.server.create('post', {authors: [admin], status: 'scheduled', title: 'Admin Post'});

            return await authenticateSession();
        });

        it('only fetches the contributor\'s draft posts', async function () {
            await visit('/posts');

            // Ensure the type, tag, and author selectors don't exist
            expect(find('[data-test-type-select]'), 'type selector').to.not.exist;
            expect(find('[data-test-tag-select]'), 'tag selector').to.not.exist;
            expect(find('[data-test-author-select]'), 'author selector').to.not.exist;

            // Trigger a sort request
            await selectChoose('[data-test-order-select]', 'Oldest');

            // API request includes author filter
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter).to.have.string(`authors:${contributor.slug}`);

            // only contributor's post is shown
            expect(findAll('[data-test-post-id]').length, 'post count').to.equal(1);
            expect(find(`[data-test-post-id="${contributorPost.id}"]`), 'author post').to.exist;
        });
    });
});
