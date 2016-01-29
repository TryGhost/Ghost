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

                // it displays success alert
                expect(find('.gh-alert-green').length, 'number of success alerts')
                    .to.equal(1);
            });
        });

        it('handles validation errors in step 2', function () {
            let postCount = 0;

            invalidateSession(application);
            server.loadFixtures('roles');

            server.post('/authentication/setup', function () {
                postCount++;

                // validation error
                if (postCount === 1) {
                    return new Mirage.Response(422, {}, {
                        errors: [
                            {
                                errorType: 'ValidationError',
                                message: 'Server response message'
                            }
                        ]
                    });
                }

                // server error
                if (postCount === 2) {
                    return new Mirage.Response(500, {}, null);
                }
            });

            visit('/setup/two');
            click('.btn-green');

            andThen(() => {
                // non-server validation
                expect(find('.main-error').text().trim(), 'error text')
                    .to.not.be.blank;
            });

            fillIn('[name="email"]', 'test@example.com');
            fillIn('[name="name"]', 'Test User');
            fillIn('[name="password"]', 'password');
            fillIn('[name="blog-title"]', 'Blog Title');

            // first post - simulated validation error
            click('.btn-green');

            andThen(() => {
                expect(find('.main-error').text().trim(), 'error text')
                    .to.equal('Server response message');
            });

            // second post - simulated server error
            click('.btn-green');

            andThen(() => {
                expect(find('.main-error').text().trim(), 'error text')
                    .to.be.blank;

                expect(find('.gh-alert-red').length, 'number of alerts')
                    .to.equal(1);
            });
        });

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

        it('handles validation errors in step 3', function () {
            let input = '[name="users"]';
            let postCount = 0;
            let button, formGroup, user;

            invalidateSession(application);
            server.loadFixtures('roles');

            server.post('/users', function (db, request) {
                let [params] = JSON.parse(request.requestBody).users;

                postCount++;

                // invalid
                if (postCount === 1) {
                    return new Mirage.Response(422, {}, {
                        errors: [
                            {
                                errorType: 'ValidationError',
                                message: 'Dummy validation error'
                            }
                        ]
                    });
                }

                // valid
                user = db.users.insert(params);
                return {
                    users: [user]
                };
            });

            // complete step 2 so we can access step 3
            visit('/setup/two');
            fillIn('[name="email"]', 'test@example.com');
            fillIn('[name="name"]', 'Test User');
            fillIn('[name="password"]', 'password');
            fillIn('[name="blog-title"]', 'Blog Title');
            click('.btn-green');

            // default field/button state
            andThen(() => {
                formGroup = find('.gh-flow-invite .form-group');
                button = find('.gh-flow-invite button[type="submit"]');

                expect(formGroup.hasClass('error'), 'default field has error class')
                    .to.be.false;

                expect(button.text().trim(), 'default button text')
                    .to.equal('Invite some users');

                expect(button.hasClass('btn-minor'), 'default button is disabled')
                    .to.be.true;
            });

            // no users submitted state
            click('.gh-flow-invite button[type="submit"]');

            andThen(() => {
                expect(formGroup.hasClass('error'), 'no users submitted field has error class')
                    .to.be.true;

                expect(button.text().trim(), 'no users submitted button text')
                    .to.equal('No users to invite');

                expect(button.hasClass('btn-minor'), 'no users submitted button is disabled')
                    .to.be.true;
            });

            // single invalid email
            fillIn(input, 'invalid email');
            triggerEvent(input, 'blur');

            andThen(() => {
                expect(formGroup.hasClass('error'), 'invalid field has error class')
                    .to.be.true;

                expect(button.text().trim(), 'single invalid button text')
                    .to.equal('1 invalid email address');

                expect(button.hasClass('btn-minor'), 'invalid email button is disabled')
                    .to.be.true;
            });

            // multiple invalid emails
            fillIn(input, 'invalid email\nanother invalid address');
            triggerEvent(input, 'blur');

            andThen(() => {
                expect(button.text().trim(), 'multiple invalid button text')
                    .to.equal('2 invalid email addresses');
            });

            // single valid email
            fillIn(input, 'invited@example.com');
            triggerEvent(input, 'blur');

            andThen(() => {
                expect(formGroup.hasClass('error'), 'valid field has error class')
                    .to.be.false;

                expect(button.text().trim(), 'single valid button text')
                    .to.equal('Invite 1 user');

                expect(button.hasClass('btn-green'), 'valid email button is enabled')
                    .to.be.true;
            });

            // multiple valid emails
            fillIn(input, 'invited1@example.com\ninvited2@example.com');
            triggerEvent(input, 'blur');

            andThen(() => {
                expect(button.text().trim(), 'multiple valid button text')
                    .to.equal('Invite 2 users');
            });

            // submit invitations with simulated failure on 1 invite
            click('.btn-green');

            andThen(() => {
                // it redirects to the home / "content" screen
                expect(currentURL(), 'url after submitting invites')
                    .to.equal('/');

                // it displays success alert
                expect(find('.gh-alert-green').length, 'number of success alerts')
                    .to.equal(1);

                // it displays failure alert
                expect(find('.gh-alert-red').length, 'number of failure alerts')
                    .to.equal(1);
            });
        });
    });
});
