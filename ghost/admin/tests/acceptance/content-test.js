import {describe, it, beforeEach, afterEach} from 'mocha';
import {expect} from 'chai';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import {
    invalidateSession,
    authenticateSession
} from 'ghost-admin/tests/helpers/ember-simple-auth';
import testSelector from 'ember-test-selectors';

describe('Acceptance: Content', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/');

        andThen(function () {
            expect(currentURL()).to.equal('/signin');
        });
    });

    describe('as admin', function () {
        let publishedPost, scheduledPost, draftPost, publishedPage, authorPost;

        beforeEach(function () {
            let adminRole = server.create('role', {name: 'Administrator'});
            let admin = server.create('user', {roles: [adminRole]});
            let editorRole = server.create('role', {name: 'Editor'});
            let editor = server.create('user', {roles: [editorRole]});

            publishedPost = server.create('post', {authorId: admin.id, status: 'published', title: 'Published Post'});
            scheduledPost = server.create('post', {authorId: admin.id, status: 'scheduled', title: 'Scheduled Post'});
            draftPost     = server.create('post', {authorId: admin.id, status: 'draft', title: 'Draft Post'});
            publishedPage = server.create('post', {authorId: admin.id, status: 'published', page: true, title: 'Published Page'});
            authorPost    = server.create('post', {authorId: editor.id, status: 'published', title: 'Editor Published Post'});

            return authenticateSession(application);
        });

        it('displays and filters posts', function () {
            visit('/');

            andThen(() => {
                // All filter is active by default
                expect(find(testSelector('all-filter-link'))).to.have.class('active');
                // Not checking request here as it won't be the last request made
                // Displays all posts + pages
                expect(find(testSelector('posts-list-item-id')).length, 'all posts count').to.equal(5);
            });

            click(testSelector('drafts-filter-link'));

            andThen(() => {
                // Filter link is highlighted
                expect(find(testSelector('drafts-filter-link'))).to.have.class('active');
                // API request is correct
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.status, '"drafts" request status param').to.equal('draft');
                expect(lastRequest.queryParams.staticPages, '"drafts" request staticPages param').to.equal('false');
                // Displays draft post
                expect(find(testSelector('posts-list-item-id')).length, 'drafts count').to.equal(1);
                expect(find(testSelector('posts-list-item-id', draftPost.id)), 'draft post').to.exist;
            });

            click(testSelector('published-filter-link'));

            andThen(() => {
                // Filter link is highlighted
                expect(find(testSelector('published-filter-link'))).to.have.class('active');
                // API request is correct
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.status, '"published" request status param').to.equal('published');
                expect(lastRequest.queryParams.staticPages, '"published" request staticPages param').to.equal('false');
                // Displays three published posts + pages
                expect(find(testSelector('posts-list-item-id')).length, 'published count').to.equal(2);
                expect(find(testSelector('posts-list-item-id', publishedPost.id)), 'admin published post').to.exist;
                expect(find(testSelector('posts-list-item-id', authorPost.id)), 'author published post').to.exist;
            });

            click(testSelector('scheduled-filter-link'));

            andThen(() => {
                // Filter link is highlighted
                expect(find(testSelector('scheduled-filter-link'))).to.have.class('active');
                // API request is correct
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.status, '"scheduled" request status param').to.equal('scheduled');
                expect(lastRequest.queryParams.staticPages, '"scheduled" request staticPages param').to.equal('false');
                // Displays scheduled post
                expect(find(testSelector('posts-list-item-id')).length, 'scheduled count').to.equal(1);
                expect(find(testSelector('posts-list-item-id', scheduledPost.id)), 'scheduled post').to.exist;
            });

            click(testSelector('pages-filter-link'));

            andThen(() => {
                // Filter link is highlighted
                expect(find(testSelector('pages-filter-link'))).to.have.class('active');
                // API request is correct
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.status, '"pages" request status param').to.equal('all');
                expect(lastRequest.queryParams.staticPages, '"pages" request staticPages param').to.equal('true');
                // Displays page
                expect(find(testSelector('posts-list-item-id')).length, 'pages count').to.equal(1);
                expect(find(testSelector('posts-list-item-id', publishedPage.id)), 'page post').to.exist;
            });

            click(testSelector('all-filter-link'));

            andThen(() => {
                // API request is correct
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.status, '"all" request status param').to.equal('all');
                expect(lastRequest.queryParams.staticPages, '"all" request staticPages param').to.equal('all');
            });
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
            authorPost = server.create('post', {authorId: author.id, status: 'published', title: 'Author Post'});
            server.create('post', {authorId: admin.id, status: 'scheduled', title: 'Admin Post'});

            return authenticateSession(application);
        });

        it('only fetches the author\'s posts', function () {
            visit('/');
            // trigger a filter request so we can grab the posts API request easily
            click(testSelector('published-filter-link'));

            andThen(() => {
                // API request includes author filter
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                expect(lastRequest.queryParams.filter).to.equal(`author:${author.slug}`);

                // only author's post is shown
                expect(find(testSelector('posts-list-item-id')).length, 'post count').to.equal(1);
                expect(find(testSelector('posts-list-item-id', authorPost.id)), 'author post').to.exist;
            });
        });
    });
});
