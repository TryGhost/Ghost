/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost-admin/tests/helpers/ember-simple-auth';
import { errorOverride, errorReset } from 'ghost-admin/tests/helpers/adapter-error';
import Mirage from 'ember-cli-mirage';

describe('Acceptance: Posts - Post', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            // load the settings fixtures
            // TODO: this should always be run for acceptance tests
            server.loadFixtures();

            return authenticateSession(application);
        });

        it('can visit post route', function () {
            let posts = server.createList('post', 6);

            visit('/');

            andThen(() => {
                expect(find('.posts-list li').length, 'post list count').to.equal(6);

                // if we're in "desktop" size, we should redirect and highlight
                if (find('.content-preview:visible').length) {
                    expect(currentURL(), 'currentURL').to.equal(`/${posts[0].id}`);
                    // expect(find('.posts-list li').first().hasClass('active'), 'highlights latest post').to.be.true;
                    expect(find('.posts-list li:nth-child(1) .status span').first().hasClass('scheduled'), 'first post in list is a scheduled one')
                        .to.be.true;
                    expect(find('.posts-list li:nth-child(3) .status span').first().hasClass('draft'), 'third post in list is a draft')
                        .to.be.true;
                    expect(find('.posts-list li:nth-child(5) .status time').first().hasClass('published'), 'fifth post in list is a published one')
                        .to.be.true;
                }
            });

            // check if we can edit the post
            click('.post-edit');

            andThen(() => {
                expect(currentURL(), 'currentURL to editor')
                    .to.equal('/editor/1');
            });

            // TODO: test the right order of the listes posts
            //  and fix the faker import to ensure correct ordering
        });

        it('redirects to 404 when post does not exist', function () {
            server.get('/posts/200/', function () {
                return new Mirage.Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'Post not found.', errorType: 'NotFoundError'}]});
            });

            errorOverride();

            visit('/200');

            andThen(() => {
                errorReset();
                expect(currentPath()).to.equal('error404');
                expect(currentURL()).to.equal('/200');
            });
        });
    });
});
