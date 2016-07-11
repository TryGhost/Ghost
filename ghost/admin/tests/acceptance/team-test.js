/* jshint expr:true */
import {
  describe,
  it,
  beforeEach,
  afterEach
} from 'mocha';
import { expect } from 'chai';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost-admin/tests/helpers/ember-simple-auth';
import { errorOverride, errorReset } from 'ghost-admin/tests/helpers/adapter-error';
import Mirage from 'ember-cli-mirage';
import $ from 'jquery';

describe('Acceptance: Team', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/team');

        andThen(function () {
            expect(currentURL()).to.equal('/signin');
        });
    });

    it('redirects correctly when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        server.create('user', {slug: 'no-access'});

        authenticateSession(application);
        visit('/team/no-access');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    it('redirects correctly when authenticated as editor', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        server.create('user', {slug: 'no-access'});

        authenticateSession(application);
        visit('/team/no-access');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team');
        });
    });

    describe('when logged in', function () {
        let admin;

        beforeEach(function () {
            let role = server.create('role', {name: 'Admininstrator'});
            admin = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        it('it renders and navigates correctly', function () {
            let user1 = server.create('user');
            let user2 = server.create('user');

            visit('/team');

            andThen(() => {
                // doesn't do any redirecting
                expect(currentURL(), 'currentURL').to.equal('/team');

                // it has correct page title
                expect(document.title, 'page title').to.equal('Team - Test Blog');

                // it shows 3 users in list (includes currently logged in user)
                expect(find('.user-list .user-list-item').length, 'user list count')
                    .to.equal(3);

                click('.user-list-item:last');

                andThen(() => {
                    // url is correct
                    expect(currentURL(), 'url after clicking user').to.equal(`/team/${user2.slug}`);

                    // title is correct
                    expect(document.title, 'title after clicking user').to.equal('Team - User - Test Blog');

                    // view title should exist and be linkable and active
                    expect(find('.view-title a[href="/ghost/team"]').hasClass('active'), 'has linkable url back to team main page')
                        .to.be.true;
                });

                click('.view-title a');

                andThen(() => {
                    // url should be /team again
                    expect(currentURL(), 'url after clicking back').to.equal('/team');
                });
            });
        });

        describe('invite new user', function () {
            let emailInputField = '.fullscreen-modal input[name="email"]';

            // @TODO: Evaluate after the modal PR goes in
            it('modal loads correctly', function () {
                visit('/team');

                andThen(() => {
                    // url is correct
                    expect(currentURL(), 'currentURL').to.equal('/team');

                    // invite user button exists
                    expect(find('.view-actions .btn-green').html(), 'invite people button text')
                        .to.equal('Invite People');
                });

                click('.view-actions .btn-green');

                andThen(() => {
                    let roleOptions = find('#new-user-role select option');

                    function checkOwnerExists() {
                        for (let i in roleOptions) {
                            if (roleOptions[i].tagName === 'option' && roleOptions[i].text === 'Owner') {
                                return true;
                            }
                        }
                        return false;
                    }

                    function checkSelectedIsAuthor() {
                        for (let i in roleOptions) {
                            if (roleOptions[i].selected) {
                                return roleOptions[i].text === 'Author';
                            }
                        }
                        return false;
                    }

                    // should be 3 available roles
                    expect(roleOptions.length, 'number of available roles').to.equal(3);

                    expect(checkOwnerExists(), 'owner role isn\'t available').to.be.false;
                    expect(checkSelectedIsAuthor(), 'author role is selected initially').to.be.true;
                });
            });

            it('sends an invite correctly', function () {
                visit('/team');

                andThen(() => {
                    expect(find('.user-list.invited-users .user-list-item').length, 'number of invited users').to.equal(0);
                });

                click('.view-actions .btn-green');
                click(emailInputField);
                triggerEvent(emailInputField, 'blur');

                andThen(() => {
                    expect(find('.modal-body .form-group:first').hasClass('error'), 'email input has error status').to.be.true;
                    expect(find('.modal-body .form-group:first .response').text()).to.contain('Please enter an email.');
                });

                fillIn(emailInputField, 'test@example.com');
                click('.fullscreen-modal .btn-green');

                andThen(() => {
                    expect(find('.user-list.invited-users .user-list-item').length, 'number of invited users').to.equal(1);
                    expect(find('.user-list.invited-users .user-list-item:first .name').text(), 'name of invited user').to.equal('test@example.com');
                });

                click('.user-list.invited-users .user-list-item:first .user-list-item-aside .user-list-action:contains("Revoke")');

                andThen(() => {
                    expect(find('.user-list.invited-users .user-list-item').length, 'number of invited users').to.equal(0);
                });
            });

            it('fails sending an invite correctly', function () {
                server.create('user', {email: 'test1@example.com'});
                server.create('user', {email: 'test2@example.com', status: 'invited'});

                visit('/team');

                // check our users lists are what we expect
                andThen(() => {
                    expect(find('.user-list.invited-users .user-list-item').length, 'number of invited users')
                        .to.equal(1);
                    // number of active users is 2 because of the logged-in user
                    expect(find('.user-list.active-users .user-list-item').length, 'number of active users')
                        .to.equal(2);
                });

                // click the "invite new user" button to open the modal
                click('.view-actions .btn-green');

                // fill in and submit the invite user modal with an existing user
                fillIn(emailInputField, 'test1@example.com');
                click('.fullscreen-modal .btn-green');

                andThen(() => {
                    // check the inline-validation
                    expect(find('.fullscreen-modal .error .response').text().trim(), 'inviting existing user error')
                        .to.equal('A user with that email address already exists.');
                });

                // fill in and submit the invite user modal with an invited user
                fillIn(emailInputField, 'test2@example.com');
                click('.fullscreen-modal .btn-green');

                andThen(() => {
                    // check the inline-validation
                    expect(find('.fullscreen-modal .error .response').text().trim(), 'inviting invited user error')
                        .to.equal('A user with that email address was already invited.');

                    // ensure that there's been no change in our user lists
                    expect(find('.user-list.invited-users .user-list-item').length, 'number of invited users after failed invites')
                        .to.equal(1);
                    expect(find('.user-list.active-users .user-list-item').length, 'number of active users after failed invites')
                        .to.equal(2);
                });
            });
        });

        describe('existing user', function () {
            let user;

            beforeEach(function () {
                user = server.create('user', {
                    slug: 'test-1',
                    name: 'Test User',
                    facebook: 'test',
                    twitter: '@test'
                });

                server.loadFixtures();
            });

            it('input fields reset and validate correctly', function () {
                // test user name
                visit('/team/test-1');

                andThen(() => {
                    expect(currentURL(), 'currentURL').to.equal('/team/test-1');
                    expect(find('.user-details-top .first-form-group input.user-name').val(), 'current user name').to.equal('Test User');
                });

                // test empty user name
                fillIn('.user-details-top .first-form-group input.user-name', '');
                triggerEvent('.user-details-top .first-form-group input.user-name', 'blur');

                andThen(() => {
                    expect(find('.user-details-top .first-form-group').hasClass('error'), 'username input is in error state with blank input').to.be.true;
                });

                // test too long user name
                fillIn('.user-details-top .first-form-group input.user-name', new Array(160).join('a'));
                triggerEvent('.user-details-top .first-form-group input.user-name', 'blur');

                andThen(() => {
                    expect(find('.user-details-top .first-form-group').hasClass('error'), 'username input is in error state with too long input').to.be.true;
                });

                // reset name field
                fillIn('.user-details-top .first-form-group input.user-name', 'Test User');

                andThen(() => {
                    expect(find('.user-details-bottom input[name="user"]').val(), 'slug value is default').to.equal('test-1');
                });

                fillIn('.user-details-bottom input[name="user"]', '');
                triggerEvent('.user-details-bottom input[name="user"]', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom input[name="user"]').val(), 'slug value is reset to original upon empty string').to.equal('test-1');
                });

                fillIn('.user-details-bottom input[name="user"]', 'white space');
                triggerEvent('.user-details-bottom input[name="user"]', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom input[name="user"]').val(), 'slug value is correctly dasherized').to.equal('white-space');
                });

                fillIn('.user-details-bottom input[name="email"]', 'thisisnotanemail');
                triggerEvent('.user-details-bottom input[name="email"]', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom .form-group:nth-of-type(2)').hasClass('error'), 'email input should be in error state with invalid email').to.be.true;
                });

                fillIn('.user-details-bottom input[name="email"]', 'test@example.com');
                fillIn('#user-location', new Array(160).join('a'));
                triggerEvent('#user-location', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom .form-group:nth-of-type(3)').hasClass('error'), 'location input should be in error state').to.be.true;
                });

                fillIn('#user-location', '');
                fillIn('#user-website', 'thisisntawebsite');
                triggerEvent('#user-website', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom .form-group:nth-of-type(4)').hasClass('error'), 'website input should be in error state').to.be.true;
                });

                // Testing Facebook input

                andThen(() => {
                    // displays initial value
                    expect(find('#user-facebook').val(), 'initial facebook value')
                        .to.equal('https://www.facebook.com/test');
                });

                triggerEvent('#user-facebook', 'focus');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    // regression test: we still have a value after the input is
                    // focused and then blurred without any changes
                    expect(find('#user-facebook').val(), 'facebook value after blur with no change')
                        .to.equal('https://www.facebook.com/test');
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', ')(*&%^%)');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be.true;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'pages/)(*&%^%)');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/pages/)(*&%^%)');
                    expect(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'testing');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testing');
                    expect(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'somewebsite.com/pages/some-facebook-page/857469375913?ref=ts');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                    expect(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'test');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be.true;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'http://twitter.com/testuser');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testuser');
                    expect(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'facebook.com/testing');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testing');
                    expect(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                // Testing Twitter input

                andThen(() => {
                    // loads fixtures and performs transform
                    expect(find('#user-twitter').val(), 'initial twitter value')
                        .to.equal('https://twitter.com/test');
                });

                triggerEvent('#user-twitter', 'focus');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    // regression test: we still have a value after the input is
                    // focused and then blurred without any changes
                    expect(find('#user-twitter').val(), 'twitter value after blur with no change')
                        .to.equal('https://twitter.com/test');
                });

                fillIn('#user-twitter', '');
                fillIn('#user-twitter', ')(*&%^%)');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be.true;
                });

                fillIn('#user-twitter', '');
                fillIn('#user-twitter', 'name');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    expect(find('#user-twitter').val()).to.be.equal('https://twitter.com/name');
                    expect(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be.false;
                });

                fillIn('#user-twitter', '');
                fillIn('#user-twitter', 'http://github.com/user');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    expect(find('#user-twitter').val()).to.be.equal('https://twitter.com/user');
                    expect(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be.false;
                });

                fillIn('#user-twitter', '');
                fillIn('#user-twitter', 'twitter.com/user');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    expect(find('#user-twitter').val()).to.be.equal('https://twitter.com/user');
                    expect(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be.false;
                });

                fillIn('#user-website', '');
                fillIn('#user-bio', new Array(210).join('a'));
                triggerEvent('#user-bio', 'blur');

                andThen(() => {
                    expect(find('.user-details-bottom .form-group:nth-of-type(7)').hasClass('error'), 'bio input should be in error state').to.be.true;
                });

                // password reset ------

                // button triggers validation
                click('.button-change-password');

                andThen(() => {
                    expect(
                        find('#user-password-new').closest('.form-group').hasClass('error'),
                        'new password has error class when blank'
                    ).to.be.true;

                    expect(
                        find('#user-password-new').siblings('.response').text(),
                        'new password error when blank'
                    ).to.match(/can't be blank/);
                });

                // typing in inputs clears validation
                fillIn('#user-password-new', 'password');
                triggerEvent('#user-password-new', 'input');

                andThen(() => {
                    expect(
                        find('#user-password-new').closest('.form-group').hasClass('error'),
                        'password validation is visible after typing'
                    ).to.be.false;
                });

                // enter key triggers action
                keyEvent('#user-password-new', 'keyup', 13);

                andThen(() => {
                    expect(
                        find('#user-new-password-verification').closest('.form-group').hasClass('error'),
                        'confirm password has error class when it doesn\'t match'
                    ).to.be.true;

                    expect(
                        find('#user-new-password-verification').siblings('.response').text(),
                        'confirm password error when it doesn\'t match'
                    ).to.match(/do not match/);
                });

                // submits with correct details
                fillIn('#user-new-password-verification', 'password');
                click('.button-change-password');

                andThen(() => {
                    // hits the endpoint
                    let [lastRequest] = server.pretender.handledRequests.slice(-1);
                    let params = $.deparam(lastRequest.requestBody);

                    expect(lastRequest.url, 'password request URL')
                        .to.match(/\/users\/password/);

                    /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
                    expect(params.password[0].user_id).to.equal(user.id.toString());
                    expect(params.password[0].newPassword).to.equal('password');
                    expect(params.password[0].ne2Password).to.equal('password');
                    /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

                    // clears the fields
                    expect(
                        find('#user-password-new').val(),
                        'password field after submit'
                    ).to.be.blank;

                    expect(
                        find('#user-new-password-verification').val(),
                        'password verification field after submit'
                    ).to.be.blank;

                    // displays a notification
                    expect(
                        find('.gh-notifications .gh-notification').length,
                        'password saved notification is displayed'
                    ).to.equal(1);
                });
            });
        });

        describe('own user', function () {
            beforeEach(function () {
                server.loadFixtures();
            });

            it('requires current password when changing password', function () {
                visit(`/team/${admin.slug}`);

                // test the "old password" field is validated
                click('.button-change-password');

                andThen(() => {
                    // old password has error
                    expect(
                        find('#user-password-old').closest('.form-group').hasClass('error'),
                        'old password has error class when blank'
                    ).to.be.true;

                    expect(
                        find('#user-password-old').siblings('.response').text(),
                        'old password error when blank'
                    ).to.match(/is required/);

                    // new password has error
                    expect(
                        find('#user-password-new').closest('.form-group').hasClass('error'),
                        'new password has error class when blank'
                    ).to.be.true;

                    expect(
                        find('#user-password-new').siblings('.response').text(),
                        'new password error when blank'
                    ).to.match(/can't be blank/);
                });

                // validation is cleared when typing
                fillIn('#user-password-old', 'password');
                triggerEvent('#user-password-old', 'input');

                andThen(() => {
                    expect(
                        find('#user-password-old').closest('.form-group').hasClass('error'),
                        'old password validation is in error state after typing'
                    ).to.be.false;
                });
            });
        });

        it('redirects to 404 when tag does not exist', function () {
            server.get('/users/slug/unknown/', function () {
                return new Mirage.Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'User not found.', errorType: 'NotFoundError'}]});
            });

            errorOverride();

            visit('/team/unknown');

            andThen(() => {
                errorReset();
                expect(currentPath()).to.equal('error404');
                expect(currentURL()).to.equal('/team/unknown');
            });
        });
    });
});
