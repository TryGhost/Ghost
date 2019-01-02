import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
import {currentURL, find, findAll, triggerEvent, visit} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';

describe('Acceptance: Content', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/');

        expect(currentURL()).to.equal('/signin');
    });

    describe('as admin', function () {
        let admin, editor,
            publishedPost, scheduledPost, draftPost, publishedPage, authorPost;

        beforeEach(async function () {
            let adminRole = this.server.create('role', {name: 'Administrator'});
            admin = this.server.create('user', {roles: [adminRole]});
            let editorRole = this.server.create('role', {name: 'Editor'});
            editor = this.server.create('user', {roles: [editorRole]});

            publishedPost = this.server.create('post', {authors: [admin], status: 'published', title: 'Published Post'});
            scheduledPost = this.server.create('post', {authors: [admin], status: 'scheduled', title: 'Scheduled Post'});
            draftPost = this.server.create('post', {authors: [admin], status: 'draft', title: 'Draft Post'});
            publishedPage = this.server.create('post', {authors: [admin], status: 'published', page: true, title: 'Published Page'});
            authorPost = this.server.create('post', {authors: [editor], status: 'published', title: 'Editor Published Post'});

            return await authenticateSession();
        });

        it('displays and filters posts', async function () {
            await visit('/');
            // Not checking request here as it won't be the last request made
            // Displays all posts + pages
            expect(findAll('[data-test-post-id]').length, 'all posts count').to.equal(5);

            // show draft posts
            await selectChoose('[data-test-type-select]', 'Draft posts');

            // API request is correct
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"drafts" request status filter').to.have.string('status:draft');
            expect(lastRequest.queryParams.filter, '"drafts" request page filter').to.have.string('page:false');
            // Displays draft post
            expect(findAll('[data-test-post-id]').length, 'drafts count').to.equal(1);
            expect(find(`[data-test-post-id="${draftPost.id}"]`), 'draft post').to.exist;

            // show published posts
            await selectChoose('[data-test-type-select]', 'Published posts');

            // API request is correct
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"published" request status filter').to.have.string('status:published');
            expect(lastRequest.queryParams.filter, '"published" request page filter').to.have.string('page:false');
            // Displays three published posts + pages
            expect(findAll('[data-test-post-id]').length, 'published count').to.equal(2);
            expect(find(`[data-test-post-id="${publishedPost.id}"]`), 'admin published post').to.exist;
            expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author published post').to.exist;

            // show scheduled posts
            await selectChoose('[data-test-type-select]', 'Scheduled posts');

            // API request is correct
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"scheduled" request status filter').to.have.string('status:scheduled');
            expect(lastRequest.queryParams.filter, '"scheduled" request page filter').to.have.string('page:false');
            // Displays scheduled post
            expect(findAll('[data-test-post-id]').length, 'scheduled count').to.equal(1);
            expect(find(`[data-test-post-id="${scheduledPost.id}"]`), 'scheduled post').to.exist;

            // show pages
            await selectChoose('[data-test-type-select]', 'Pages');

            // API request is correct
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"pages" request status filter').to.have.string('status:[draft,scheduled,published]');
            expect(lastRequest.queryParams.filter, '"pages" request page filter').to.have.string('page:true');
            // Displays page
            expect(findAll('[data-test-post-id]').length, 'pages count').to.equal(1);
            expect(find(`[data-test-post-id="${publishedPage.id}"]`), 'page post').to.exist;

            // show all posts
            await selectChoose('[data-test-type-select]', 'All posts');

            // API request is correct
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.filter, '"all" request status filter').to.have.string('status:[draft,scheduled,published]');
            expect(lastRequest.queryParams.filter, '"all" request page filter').to.have.string('page:[true,false]');

            // show all posts by editor
            await selectChoose('[data-test-author-select]', editor.name);

            // API request is correct
            [lastRequest] = this.server.pretender.handledRequests.slice(-1);
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

        it('sorts tags filter alphabetically', async function () {
            this.server.create('tag', {name: 'B - Second', slug: 'second'});
            this.server.create('tag', {name: 'Z - Last', slug: 'last'});
            this.server.create('tag', {name: 'A - First', slug: 'first'});

            await visit('/');
            await clickTrigger('[data-test-tag-select]');

            let options = findAll('.ember-power-select-option');

            expect(options[0].textContent.trim()).to.equal('All tags');
            expect(options[1].textContent.trim()).to.equal('A - First');
            expect(options[2].textContent.trim()).to.equal('B - Second');
            expect(options[3].textContent.trim()).to.equal('Z - Last');
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
            await visit('/');
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
            await visit('/');

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
