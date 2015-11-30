/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import Ember from 'ember';
import startApp from 'ghost/tests/helpers/start-app';
import destroyApp from 'ghost/tests/helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost/tests/helpers/ember-simple-auth';
import Mirage from 'ember-cli-mirage';

describe('Acceptance: Setup', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects if already authenticated', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);

        visit('/setup/one');
        andThen(() => {
            expect(currentURL()).to.equal('/');
        });

        visit('/setup/two');
        andThen(() => {
            expect(currentURL()).to.equal('/');
        });

        visit('/setup/three');
        andThen(() => {
            expect(currentURL()).to.equal('/');
        });
    });

    it('redirects to signin if already set up', function () {
        // mimick an already setup blog
        server.get('/authentication/setup/', function () {
            return {
                setup: [
                    {status: true}
                ]
            };
        });

        invalidateSession(application);

        visit('/setup');
        andThen(() => {
            expect(currentURL()).to.equal('/signin');
        });
    });

    describe('with a new blog', function () {
        beforeEach(function () {
            // mimick a new blog
            server.get('/authentication/setup/', function () {
                return {
                    setup: [
                        {status: false}
                    ]
                };
            });
        });

        it('has a successful happy path', function () {
            invalidateSession(application);
            server.loadFixtures('roles');

            visit('/setup');

            andThen(() => {
                // it redirects to step one
                expect(currentURL(), 'url after accessing /setup')
                    .to.equal('/setup/one');

                // it highlights first step
                expect(find('.gh-flow-nav .step:first-of-type').hasClass('active'))
                    .to.be.true;
                expect(find('.gh-flow-nav .step:nth-of-type(2)').hasClass('active'))
                    .to.be.false;
                expect(find('.gh-flow-nav .step:nth-of-type(3)').hasClass('active'))
                    .to.be.false;

                // it displays download count (count increments for each ajax call
                // and polling is disabled in testing so our count should be "2" -
                // 1 for first load and 1 for first poll)
                expect(find('.gh-flow-content em').text()).to.equal('2');
            });

            click('.btn-green');

            andThen(() => {
                // it transitions to step two
                expect(currentURL(), 'url after clicking "Create your account"')
                    .to.equal('/setup/two');

                // email field is focused by default
                // NOTE: $('x').is(':focus') doesn't work in phantomjs CLI runner
                // https://github.com/ariya/phantomjs/issues/10427
                expect(find('[name="email"]').get(0) === document.activeElement, 'email field has focus')
                    .to.be.true;
            });

            click('.btn-green');

            andThen(() => {
                // it marks fields as invalid
                expect(find('.form-group.error').length, 'number of invalid fields')
                    .to.equal(4);

                // it displays error messages
                expect(find('.error .response').length, 'number of in-line validation messages')
                    .to.equal(4);

                // it displays main error
                expect(find('.main-error').length, 'main error is displayed')
                    .to.equal(1);
            });

            // enter valid details and submit
            fillIn('[name="email"]', 'test@example.com');
            fillIn('[name="name"]', 'Test User');
            fillIn('[name="password"]', 'password');
            fillIn('[name="blog-title"]', 'Blog Title');
            click('.btn-green');

            andThen(() => {
                // it transitions to step 3
                expect(currentURL(), 'url after submitting step two')
                    .to.equal('/setup/three');

                // submit button is "disabled"
                expect(find('button[type="submit"]').hasClass('btn-green'), 'invite button with no emails is white')
                    .to.be.false;
            });

            // fill in a valid email
            fillIn('[name="users"]', 'new-user@example.com');

            andThen(() => {
                // submit button is "enabled"
                expect(find('button[type="submit"]').hasClass('btn-green'), 'invite button is green with valid email address')
                    .to.be.true;
            });

            // submit the invite form
            click('button[type="submit"]');

            andThen(() => {
                // it redirects to the home / "content" screen
                expect(currentURL(), 'url after submitting invites')
                    .to.equal('/');
            });
        });

        it('handles server validation errors in step 2');
        it('handles server validation errors in step 3');

        it('handles invalid origin error on step 2', function () {
            // mimick the API response for an invalid origin
            server.post('/authentication/token', function () {
                return new Mirage.Response(401, {}, {
                    errors: [
                        {
                            errorType: 'UnauthorizedError',
                            message: 'Access Denied from url: unknown.com. Please use the url configured in config.js.'
                        }
                    ]
                });
            });

            invalidateSession(application);
            server.loadFixtures('roles');

            visit('/setup/two');
            fillIn('[name="email"]', 'test@example.com');
            fillIn('[name="name"]', 'Test User');
            fillIn('[name="password"]', 'password');
            fillIn('[name="blog-title"]', 'Blog Title');
            click('.btn-green');

            andThen(() => {
                // button should not be spinning
                expect(find('.btn-green .spinner').length, 'button has spinner')
                    .to.equal(0);
                // we should show an error message
                expect(find('.main-error').text(), 'error text')
                    .to.equal('Access Denied from url: unknown.com. Please use the url configured in config.js.');
            });
        });
    });
});
