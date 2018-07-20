import destroyApp from '../helpers/destroy-app';
import startApp from '../helpers/start-app';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {
    authenticateSession,
    invalidateSession
} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Content', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/');

        expect(currentURL()).to.equal('/signin');
    });

    describe('as admin', function () {
        let admin, editor,
            publishedPost, scheduledPost, draftPost, publishedPage, authorPost;

        beforeEach(function () {
            let adminRole = server.create('role', {name: 'Administrator'});
            admin = server.create('user', {roles: [adminRole]});
            let editorRole = server.create('role', {name: 'Editor'});
            editor = server.create('user', {roles: [editorRole]});

            publishedPost = server.create('post', {authors: [admin], status: 'published', title: 'Published Post'});
            scheduledPost = server.create('post', {authors: [admin], status: 'scheduled', title: 'Scheduled Post'});
            draftPost = server.create('post', {authors: [admin], status: 'draft', title: 'Draft Post'});
            publishedPage = server.create('post', {authors: [admin], status: 'published', page: true, title: 'Published Page'});
            authorPost = server.create('post', {authors: [editor], status: 'published', title: 'Editor Published Post'});

            return authenticateSession(application);
        });

        it('displays and filters posts', async function () {
            await visit('/');
            // Not checking request here as it won't be the last request made
            // Displays all posts + pages
            expect(find('[data-test-post-id]').length, 'all posts count').to.equal(5);

            // show draft posts
            await selectChoose('[data-test-type-select]', 'Draft posts');

            // API request is correct
            let [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"drafts" request status filter').to.have.string('status:draft');
            expect(lastRequest.queryParams.filter, '"drafts" request page filter').to.have.string('page:false');
            // Displays draft post
            expect(find('[data-test-post-id]').length, 'drafts count').to.equal(1);
            expect(find(`[data-test-post-id="${draftPost.id}"]`), 'draft post').to.exist;

            // show published posts
            await selectChoose('[data-test-type-select]', 'Published posts');

            // API request is correct
            [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"published" request status filter').to.have.string('status:published');
            expect(lastRequest.queryParams.filter, '"published" request page filter').to.have.string('page:false');
            // Displays three published posts + pages
            expect(find('[data-test-post-id]').length, 'published count').to.equal(2);
            expect(find(`[data-test-post-id="${publishedPost.id}"]`), 'admin published post').to.exist;
            expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author published post').to.exist;

            // show scheduled posts
            await selectChoose('[data-test-type-select]', 'Scheduled posts');

            // API request is correct
            [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"scheduled" request status filter').to.have.string('status:scheduled');
            expect(lastRequest.queryParams.filter, '"scheduled" request page filter').to.have.string('page:false');
            // Displays scheduled post
            expect(find('[data-test-post-id]').length, 'scheduled count').to.equal(1);
            expect(find(`[data-test-post-id="${scheduledPost.id}"]`), 'scheduled post').to.exist;

            // show pages
            await selectChoose('[data-test-type-select]', 'Pages');

            // API request is correct
            [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"pages" request status filter').to.have.string('status:[draft,scheduled,published]');
            expect(lastRequest.queryParams.filter, '"pages" request page filter').to.have.string('page:true');
            // Displays page
            expect(find('[data-test-post-id]').length, 'pages count').to.equal(1);
            expect(find(`[data-test-post-id="${publishedPage.id}"]`), 'page post').to.exist;

            // show all posts
            await selectChoose('[data-test-type-select]', 'All posts');

            // API request is correct
            [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"all" request status filter').to.have.string('status:[draft,scheduled,published]');
            expect(lastRequest.queryParams.filter, '"all" request page filter').to.have.string('page:[true,false]');

            // show all posts by editor
            await selectChoose('[data-test-author-select]', editor.name);

            // API request is correct
            [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"editor" request status filter').to.have.string('status:[draft,scheduled,published]');
            expect(lastRequest.queryParams.filter, '"editor" request page filter').to.have.string('page:[true,false]');
            expect(lastRequest.queryParams.filter, '"editor" request filter param').to.have.string(`authors:${editor.slug}`);

            // Displays editor post
            // TODO: implement "filter" param support and fix mirage post->author association
            // expect(find('[data-test-post-id]').length, 'editor post count').to.equal(1);
            // expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author post').to.exist;

            // TODO: test tags dropdown

            // Double-click on a post opens editor
            await triggerEvent(`[data-test-post-id="${authorPost.id}"]`, 'dblclick');

            expect(currentURL(), 'url after double-click').to.equal(`/editor/${authorPost.id}`);
        });
    });

    describe('as author', function () {
        let author, authorPost;

        beforeEach(function () {
            let authorRole = server.create('role', {name: 'Author'});
            author = server.create('user', {roles: [authorRole]});
            let adminRole = server.create('role', {name: 'Administrator'});
            let admin = server.create('user', {roles: [adminRole]});

            // create posts
            authorPost = server.create('post', {authors: [author], status: 'published', title: 'Author Post'});
            server.create('post', {authors: [admin], status: 'scheduled', title: 'Admin Post'});

            return authenticateSession(application);
        });

        it('only fetches the author\'s posts', async function () {
            await visit('/');
            // trigger a filter request so we can grab the posts API request easily
            await selectChoose('[data-test-type-select]', 'Published posts');

            // API request includes author filter
            let [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter).to.have.string(`authors:${author.slug}`);

            // only author's post is shown
            expect(find('[data-test-post-id]').length, 'post count').to.equal(1);
            expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author post').to.exist;
        });
    });

    describe('as contributor', function () {
        let contributor, contributorPost;

        beforeEach(function () {
            let contributorRole = server.create('role', {name: 'Contributor'});
            contributor = server.create('user', {roles: [contributorRole]});
            let adminRole = server.create('role', {name: 'Administrator'});
            let admin = server.create('user', {roles: [adminRole]});

            // Create posts
            contributorPost = server.create('post', {authors: [contributor], status: 'draft', title: 'Contributor Post Draft'});
            server.create('post', {authors: [contributor], status: 'published', title: 'Contributor Published Post'});
            server.create('post', {authors: [admin], status: 'scheduled', title: 'Admin Post'});

            return authenticateSession(application);
        });

        it('only fetches the contributor\'s draft posts', async function () {
            await visit('/');

            // Ensure the type, tag, and author selectors don't exist
            expect(find('[data-test-type-select]'), 'type selector').to.not.exist;
            expect(find('[data-test-tag-select]'), 'tag selector').to.not.exist;
            expect(find('[data-test-author-select]'), 'author selector').to.not.exist;

            // Trigger a sort request
            await selectChoose('[data-test-order-select]', 'Oldest');

            // API request includes author filter
            let [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter).to.have.string(`authors:${contributor.slug}`);

            // only contributor's post is shown
            expect(find('[data-test-post-id]').length, 'post count').to.equal(1);
            expect(find(`[data-test-post-id="${contributorPost.id}"]`), 'author post').to.exist;
        });
    });
});
