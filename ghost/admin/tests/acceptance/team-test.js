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

    describe('when logged in as admin', function () {
        let admin, adminRole;

        beforeEach(function () {
            adminRole = server.create('role', {name: 'Administrator'});
            admin = server.create('user', {email: 'admin@example.com', roles: [adminRole]});

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

        it('can manage invites', function () {
            let emailInputField = '.fullscreen-modal input[name="email"]';

            visit('/team');

            andThen(() => {
                // invite user button exists
                expect(
                    find('.view-actions .btn-green').text().trim(),
                    'invite people button text'
                ).to.equal('Invite People');

                // existing users are listed
                expect(
                    find('.user-list.active-users .user-list-item').length,
                    'initial number of active users'
                ).to.equal(1);

                expect(
                    find('.user-list.active-users .user-list-item:first-of-type .role-label').text().trim(),
                    'active user\'s role label'
                ).to.equal('Administrator');

                // no invites are shown
                expect(
                    find('.user-list.invited-users .user-list-item').length,
                    'initial number of invited users'
                ).to.equal(0);
            });

            // click the invite people button
            click('.view-actions .btn-green');

            andThen(() => {
                let roleOptions = find('.fullscreen-modal select[name="role"] option');

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

                // modal is displayed
                expect(
                    find('.fullscreen-modal h1').text().trim(),
                    'correct modal is displayed'
                ).to.equal('Invite a New User');

                // number of roles is correct
                expect(
                    find('.fullscreen-modal select[name="role"] option').length,
                    'number of selectable roles'
                ).to.equal(3);

                expect(checkOwnerExists(), 'owner role isn\'t available').to.be.false;
                expect(checkSelectedIsAuthor(), 'author role is selected initially').to.be.true;
            });

            // submit valid invite form
            fillIn('.fullscreen-modal input[name="email"]', 'invite1@example.com');
            click('.fullscreen-modal .btn-green');

            andThen(() => {
                // modal closes
                expect(
                    find('.fullscreen-modal').length,
                    'number of modals after sending invite'
                ).to.equal(0);

                // invite is displayed, has correct e-mail + role
                expect(
                    find('.invited-users .user-list-item').length,
                    'number of invites after first invite'
                ).to.equal(1);

                expect(
                    find('.invited-users span.name').first().text().trim(),
                    'displayed email of first invite'
                ).to.equal('invite1@example.com');

                expect(
                    find('.invited-users span.role-label').first().text().trim(),
                    'displayed role of first invite'
                ).to.equal('Author');

                // number of users is unchanged
                expect(
                    find('.active-users .user-list-item').length,
                    'number of active users after first invite'
                ).to.equal(1);
            });

            // submit new invite with different role
            click('.view-actions .btn-green');
            fillIn('.fullscreen-modal input[name="email"]', 'invite2@example.com');
            fillIn('.fullscreen-modal select[name="role"]', '2');
            click('.fullscreen-modal .btn-green');

            andThen(() => {
                // number of invites increases
                expect(
                    find('.invited-users .user-list-item').length,
                    'number of invites after second invite'
                ).to.equal(2);

                // invite has correct e-mail + role
                expect(
                    find('.invited-users span.name').last().text().trim(),
                    'displayed email of second invite'
                ).to.equal('invite2@example.com');

                expect(
                    find('.invited-users span.role-label').last().text().trim(),
                    'displayed role of second invite'
                ).to.equal('Editor');
            });

            // submit invite form with existing user
            click('.view-actions .btn-green');
            fillIn('.fullscreen-modal input[name="email"]', 'admin@example.com');
            click('.fullscreen-modal .btn-green');

            andThen(() => {
                // validation message is displayed
                expect(
                    find('.fullscreen-modal .error .response').text().trim(),
                    'inviting existing user error'
                ).to.equal('A user with that email address already exists.');
            });

            // submit invite form with existing invite
            fillIn('.fullscreen-modal input[name="email"]', 'invite1@example.com');
            click('.fullscreen-modal .btn-green');

            andThen(() => {
                // validation message is displayed
                expect(
                    find('.fullscreen-modal .error .response').text().trim(),
                    'inviting invited user error'
                ).to.equal('A user with that email address was already invited.');
            });

            // submit invite form with an invalid email
            fillIn('.fullscreen-modal input[name="email"]', 'test');
            click('.fullscreen-modal .btn-green');

            andThen(() => {
                // validation message is displayed
                expect(
                    find('.fullscreen-modal .error .response').text().trim(),
                    'inviting invalid email error'
                ).to.equal('Invalid Email.');
            });

            click('.fullscreen-modal a.close');
            // revoke latest invite
            click('.invited-users .user-list-item:last-of-type a[href="#revoke"]');

            andThen(() => {
                // number of invites decreases
                expect(
                    find('.invited-users .user-list-item').length,
                    'number of invites after revoke'
                ).to.equal(1);

                // notification is displayed
                expect(
                    find('.gh-notification').text().trim(),
                    'notifications contain revoke'
                ).to.match(/Invitation revoked\. \(invite2@example\.com\)/);

                // correct invite is removed
                expect(
                    find('.invited-users span.name').text().trim(),
                    'displayed email of remaining invite'
                ).to.equal('invite1@example.com');
            });

            // add another invite to test ordering on resend
            click('.view-actions .btn-green');
            fillIn('.fullscreen-modal input[name="email"]', 'invite3@example.com');
            click('.fullscreen-modal .btn-green');

            andThen(() => {
                // new invite should be last in the list
                expect(
                    find('.invited-users span.name').last().text().trim(),
                    'last invite email in list'
                ).to.equal('invite3@example.com');
            });

            // resend first invite
            click('.invited-users .user-list-item:first-of-type a[href="#resend"]');

            andThen(() => {
                // notification is displayed
                expect(
                    find('.gh-notification').text().trim(),
                    'notifications contain resend'
                ).to.match(/Invitation resent! \(invite1@example\.com\)/);

                // first invite is still at the top
                expect(
                    find('.invited-users span.name').first().text().trim(),
                    'first invite email in list'
                ).to.equal('invite1@example.com');
            });

            // regression test: can revoke a resent invite
            click('.invited-users .user-list-item:first-of-type a[href="#resend"]');
            click('.invited-users .user-list-item:first-of-type a[href="#revoke"]');

            andThen(() => {
                // number of invites decreases
                expect(
                    find('.invited-users .user-list-item').length,
                    'number of invites after resend/revoke'
                ).to.equal(1);

                // notification is displayed
                expect(
                    find('.gh-notification').text().trim(),
                    'notifications contain revoke after resend/revoke'
                ).to.match(/Invitation revoked\. \(invite1@example\.com\)/);
            });
        });

        it('can delete users', function () {
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            let user1 = server.create('user');
            let user2 = server.create('user');
            let post1 = server.create('post', {author_id: user2.id});
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */

            visit('/team');
            click(`a.user-list-item:contains("${user1.name}")`);

            // user deletion displays modal
            click('button.delete');
            andThen(() => {
                expect(
                    find('.fullscreen-modal .modal-content:contains("delete this user")').length,
                    'user deletion modal displayed after button click'
                ).to.equal(1);

                // user has no posts so no warning about post deletion
                expect(
                    find('.fullscreen-modal .modal-content:contains("is the author of")').length,
                    'deleting user with no posts has no post count'
                ).to.equal(0);
            });

            // cancelling user deletion closes modal
            click('.fullscreen-modal button:contains("Cancel")');
            andThen(() => {
                expect(
                    find('.fullscreen-modal').length === 0,
                    'delete user modal is closed when cancelling'
                ).to.be.true;
            });

            // deleting a user with posts
            visit('/team');
            click(`a.user-list-item:contains("${user2.name}")`);

            click('button.delete');
            andThen(() => {
                // user has  posts so should warn about post deletion
                expect(
                    find('.fullscreen-modal .modal-content:contains("is the author of 1 post")').length,
                    'deleting user with posts has post count'
                ).to.equal(1);
            });

            click('.fullscreen-modal button:contains("Delete")');
            andThen(() => {
                // redirected to team page
                expect(currentURL()).to.equal('/team');

                // deleted user is not in list
                expect(
                    find(`.user-list-item .name:contains("${user2.name}")`).length,
                    'deleted user is not in user list after deletion'
                ).to.equal(0);
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
                    expect(find('#user-location').closest('.form-group').hasClass('error'), 'location input should be in error state').to.be.true;
                });

                fillIn('#user-location', '');
                fillIn('#user-website', 'thisisntawebsite');
                triggerEvent('#user-website', 'blur');

                andThen(() => {
                    expect(find('#user-website').closest('.form-group').hasClass('error'), 'website input should be in error state').to.be.true;
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
                    expect(find('#user-facebook').closest('.form-group').hasClass('error'), 'facebook input should be in error state').to.be.true;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'pages/)(*&%^%)');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/pages/)(*&%^%)');
                    expect(find('#user-facebook').closest('.form-group').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'testing');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testing');
                    expect(find('#user-facebook').closest('.form-group').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'somewebsite.com/pages/some-facebook-page/857469375913?ref=ts');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                    expect(find('#user-facebook').closest('.form-group').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'test');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').closest('.form-group').hasClass('error'), 'facebook input should be in error state').to.be.true;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'http://twitter.com/testuser');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testuser');
                    expect(find('#user-facebook').closest('.form-group').hasClass('error'), 'facebook input should be in error state').to.be.false;
                });

                fillIn('#user-facebook', '');
                fillIn('#user-facebook', 'facebook.com/testing');
                triggerEvent('#user-facebook', 'blur');

                andThen(() => {
                    expect(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testing');
                    expect(find('#user-facebook').closest('.form-group').hasClass('error'), 'facebook input should be in error state').to.be.false;
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
                    expect(find('#user-twitter').closest('.form-group').hasClass('error'), 'twitter input should be in error state').to.be.true;
                });

                fillIn('#user-twitter', '');
                fillIn('#user-twitter', 'name');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    expect(find('#user-twitter').val()).to.be.equal('https://twitter.com/name');
                    expect(find('#user-twitter').closest('.form-group').hasClass('error'), 'twitter input should be in error state').to.be.false;
                });

                fillIn('#user-twitter', '');
                fillIn('#user-twitter', 'http://github.com/user');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    expect(find('#user-twitter').val()).to.be.equal('https://twitter.com/user');
                    expect(find('#user-twitter').closest('.form-group').hasClass('error'), 'twitter input should be in error state').to.be.false;
                });

                fillIn('#user-twitter', '');
                fillIn('#user-twitter', 'twitter.com/user');
                triggerEvent('#user-twitter', 'blur');

                andThen(() => {
                    expect(find('#user-twitter').val()).to.be.equal('https://twitter.com/user');
                    expect(find('#user-twitter').closest('.form-group').hasClass('error'), 'twitter input should be in error state').to.be.false;
                });

                fillIn('#user-website', '');
                fillIn('#user-bio', new Array(210).join('a'));
                triggerEvent('#user-bio', 'blur');

                andThen(() => {
                    expect(find('#user-bio').closest('.form-group').hasClass('error'), 'bio input should be in error state').to.be.true;
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
                    let params = JSON.parse(lastRequest.requestBody);

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

        describe('using Ghost OAuth', function () {
            beforeEach(function () {
                // simulate active oauth config
                $('head').append('<meta name="env-ghostAuthId" content="6e0704b3-c653-4c12-8da7-584232b5c629" />');

                server.loadFixtures();
            });

            afterEach(function () {
                // ensure we don't leak OAuth config to other tests
                $('meta[name="env-ghostAuthId"]').remove();
            });

            it('doesn\'t show the password reset form', function () {
                visit(`/team/${admin.slug}`);

                andThen(() => {
                    // ensure that the normal form is displayed so we don't get
                    // false positives
                    expect(
                        find('input#user-slug').length,
                        'profile form is displayed'
                    ).to.equal(1);

                    // check that the password form is hidden
                    expect(
                        find('#password-reset').length,
                        'presence of password reset form'
                    ).to.equal(0);

                    expect(
                        find('#user-password-new').length,
                        'presence of new password field'
                    ).to.equal(0);
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

        it('redirects to 404 when user does not exist', function () {
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

    describe('when logged in as author', function () {
        let author, authorRole, adminRole;

        beforeEach(function () {
            adminRole = server.create('role', {name: 'Administrator'});
            authorRole = server.create('role', {name: 'Author'});
            author = server.create('user', {roles: [authorRole]});

            server.loadFixtures();

            server.get('/invites/', function () {
                return new Mirage.Response(403, {}, {
                    errors: [{
                        errorType: 'NoPermissionError',
                        message: 'You do not have permission to perform this action'
                    }]
                });
            });

            return authenticateSession(application);
        });

        it('can access the team page', function () {
            let user1 = server.create('user', {roles: [adminRole]});
            let invite1 = server.create('invite', {roles: [authorRole]});

            errorOverride();

            visit('/team');

            andThen(() => {
                errorReset();
                expect(currentPath()).to.equal('team.index');
                expect(find('.gh-alert').length).to.equal(0);
            });
        });
    });
});
