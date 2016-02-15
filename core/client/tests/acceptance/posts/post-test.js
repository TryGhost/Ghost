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
import { invalidateSession, authenticateSession } from 'ghost/tests/helpers/ember-simple-auth';
import { errorOverride, errorReset } from 'ghost/tests/helpers/adapter-error';
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
            let posts = server.createList('post', 3);

            visit('/');

            andThen(() => {
                expect(find('.posts-list li').length, 'post list count').to.equal(3);

                // if we're in "desktop" size, we should redirect and highlight
                if (find('.content-preview:visible').length) {
                    expect(currentURL(), 'currentURL').to.equal(`/${posts[0].id}`);
                    expect(find('.posts-list li').first().hasClass('active'), 'highlights latest post').to.be.true;
                }
            });
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
