import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import destroyApp from '../helpers/destroy-app';
import moment from 'moment';
import startApp from '../helpers/start-app';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {Response} from 'ember-cli-mirage';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from '../helpers/ember-simple-auth';
import {errorOverride, errorReset} from '../helpers/adapter-error';
import {expect} from 'chai';

describe('Acceptance: Team', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/team');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects correctly when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        server.create('user', {slug: 'no-access'});

        authenticateSession(application);
        await visit('/team/no-access');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects correctly when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        server.create('user', {slug: 'no-access'});

        authenticateSession(application);
        await visit('/team/no-access');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in as admin', function () {
        let admin, adminRole, suspendedUser;

        beforeEach(function () {
            server.loadFixtures('roles');
            adminRole = server.schema.roles.find(1);

            admin = server.create('user', {email: 'admin@example.com', roles: [adminRole]});

            // add an expired invite
            server.create('invite', {expires: moment.utc().subtract(1, 'day').valueOf()});

            // add a suspended user
            suspendedUser = server.create('user', {email: 'suspended@example.com', roles: [adminRole], status: 'inactive'});

            return authenticateSession(application);
        });

        it('it renders and navigates correctly', async function () {
            let user1 = server.create('user');
            let user2 = server.create('user');

            await visit('/team');

            // doesn't do any redirecting
            expect(currentURL(), 'currentURL').to.equal('/team');

            // it has correct page title
            expect(document.title, 'page title').to.equal('Team - Test Blog');

            // it shows active users in active section
            expect(
                find('[data-test-active-users] [data-test-user-id]').length,
                'number of active users'
            ).to.equal(3);
            expect(
                find(`[data-test-active-users] [data-test-user-id="${user1.id}"]`)
            ).to.exist;
            expect(
                find(`[data-test-active-users] [data-test-user-id="${user2.id}"]`)
            ).to.exist;
            expect(
                find(`[data-test-active-users] [data-test-user-id="${admin.id}"]`)
            ).to.exist;

            // it shows suspended users in suspended section
            expect(
                find('[data-test-suspended-users] [data-test-user-id]').length,
                'number of suspended users'
            ).to.equal(1);
            expect(
                find(`[data-test-suspended-users] [data-test-user-id="${suspendedUser.id}"]`)
            ).to.exist;

            await click(`[data-test-user-id="${user2.id}"]`);

            // url is correct
            expect(currentURL(), 'url after clicking user').to.equal(`/team/${user2.slug}`);

            // title is correct
            expect(document.title, 'title after clicking user').to.equal('Team - User - Test Blog');

            // view title should exist and be linkable and active
            expect(
                find('[data-test-screen-title] a[href="/ghost/team"]').hasClass('active'),
                'has linkable url back to team main page'
            ).to.be.true;

            await click('[data-test-screen-title] a');

            // url should be /team again
            expect(currentURL(), 'url after clicking back').to.equal('/team');
        });

        it('can manage invites', async function () {
            await visit('/team');

            // invite user button exists
            expect(
                find('.view-actions .gh-btn-green').text().trim(),
                'invite people button text'
            ).to.equal('Invite People');

            // existing users are listed
            expect(
                find('[data-test-user-id]').length,
                'initial number of active users'
            ).to.equal(2);

            expect(
                find('[data-test-user-id="1"] [data-test-role-name]').text().trim(),
                'active user\'s role label'
            ).to.equal('Administrator');

            // existing invites are shown
            expect(
                find('[data-test-invite-id]').length,
                'initial number of invited users'
            ).to.equal(1);

            expect(
                find('[data-test-invite-id="1"] [data-test-invite-description]').text(),
                'expired invite description'
            ).to.match(/expired/);

            // remove expired invite
            await click('[data-test-invite-id="1"] [data-test-revoke-button]');

            expect(
                find('[data-test-invite-id]').length,
                'initial number of invited users'
            ).to.equal(0);

            // click the invite people button
            await click('.view-actions .gh-btn-green');

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

            // submit valid invite form
            await fillIn('.fullscreen-modal input[name="email"]', 'invite1@example.com');
            await click('.fullscreen-modal .gh-btn-green');

            // modal closes
            expect(
                find('.fullscreen-modal').length,
                'number of modals after sending invite'
            ).to.equal(0);

            // invite is displayed, has correct e-mail + role
            expect(
                find('[data-test-invite-id]').length,
                'number of invites after first invite'
            ).to.equal(1);

            expect(
                find('[data-test-invite-id="2"] [data-test-email]').text().trim(),
                'displayed email of first invite'
            ).to.equal('invite1@example.com');

            expect(
                find('[data-test-invite-id="2"] [data-test-role-name]').text().trim(),
                'displayed role of first invite'
            ).to.equal('Author');

            expect(
                find('[data-test-invite-id="2"] [data-test-invite-description]').text(),
                'new invite description'
            ).to.match(/expires/);

            // number of users is unchanged
            expect(
                find('[data-test-user-id]').length,
                'number of active users after first invite'
            ).to.equal(2);

            // submit new invite with different role
            await click('.view-actions .gh-btn-green');
            await fillIn('.fullscreen-modal input[name="email"]', 'invite2@example.com');
            await fillIn('.fullscreen-modal select[name="role"]', '2');
            await click('.fullscreen-modal .gh-btn-green');

            // number of invites increases
            expect(
                find('[data-test-invite-id]').length,
                'number of invites after second invite'
            ).to.equal(2);

            // invite has correct e-mail + role
            expect(
                find('[data-test-invite-id="3"] [data-test-email]').text().trim(),
                'displayed email of second invite'
            ).to.equal('invite2@example.com');

            expect(
                find('[data-test-invite-id="3"] [data-test-role-name]').text().trim(),
                'displayed role of second invite'
            ).to.equal('Editor');

            // submit invite form with existing user
            await click('.view-actions .gh-btn-green');
            await fillIn('.fullscreen-modal input[name="email"]', 'admin@example.com');
            await click('.fullscreen-modal .gh-btn-green');

            // validation message is displayed
            expect(
                find('.fullscreen-modal .error .response').text().trim(),
                'inviting existing user error'
            ).to.equal('A user with that email address already exists.');

            // submit invite form with existing invite
            await fillIn('.fullscreen-modal input[name="email"]', 'invite1@example.com');
            await click('.fullscreen-modal .gh-btn-green');

            // validation message is displayed
            expect(
                find('.fullscreen-modal .error .response').text().trim(),
                'inviting invited user error'
            ).to.equal('A user with that email address was already invited.');

            // submit invite form with an invalid email
            await fillIn('.fullscreen-modal input[name="email"]', 'test');
            await click('.fullscreen-modal .gh-btn-green');

            // validation message is displayed
            expect(
                find('.fullscreen-modal .error .response').text().trim(),
                'inviting invalid email error'
            ).to.equal('Invalid Email.');

            await click('.fullscreen-modal a.close');
            // revoke latest invite
            await click('[data-test-invite-id="3"] [data-test-revoke-button]');

            // number of invites decreases
            expect(
                find('[data-test-invite-id]').length,
                'number of invites after revoke'
            ).to.equal(1);

            // notification is displayed
            expect(
                find('.gh-notification').text().trim(),
                'notifications contain revoke'
            ).to.match(/Invitation revoked\. \(invite2@example\.com\)/);

            // correct invite is removed
            expect(
                find('[data-test-invite-id] [data-test-email]').text().trim(),
                'displayed email of remaining invite'
            ).to.equal('invite1@example.com');

            // add another invite to test ordering on resend
            await click('.view-actions .gh-btn-green');
            await fillIn('.fullscreen-modal input[name="email"]', 'invite3@example.com');
            await click('.fullscreen-modal .gh-btn-green');

            // new invite should be last in the list
            expect(
                find('[data-test-invite-id]:last [data-test-email]').text().trim(),
                'last invite email in list'
            ).to.equal('invite3@example.com');

            // resend first invite
            await click('[data-test-invite-id="2"] [data-test-resend-button]');

            // notification is displayed
            expect(
                find('.gh-notification').text().trim(),
                'notifications contain resend'
            ).to.match(/Invitation resent! \(invite1@example\.com\)/);

            // first invite is still at the top
            expect(
                find('[data-test-invite-id]:first-of-type [data-test-email]').text().trim(),
                'first invite email in list'
            ).to.equal('invite1@example.com');

            // regression test: can revoke a resent invite
            await click('[data-test-invite-id]:first-of-type [data-test-resend-button]');
            await click('[data-test-invite-id]:first-of-type [data-test-revoke-button]');

            // number of invites decreases
            expect(
                find('[data-test-invite-id]').length,
                'number of invites after resend/revoke'
            ).to.equal(1);

            // notification is displayed
            expect(
                find('.gh-notification').text().trim(),
                'notifications contain revoke after resend/revoke'
            ).to.match(/Invitation revoked\. \(invite1@example\.com\)/);
        });

        it('can manage suspended users', async function () {
            await visit('/team');
            await click(`[data-test-user-id="${suspendedUser.id}"]`);

            expect(find('[data-test-suspended-badge]')).to.exist;

            await click('[data-test-user-actions]');
            await click('[data-test-unsuspend-button]');
            await click('[data-test-modal-confirm]');

            // NOTE: there seems to be a timing issue with this test - pausing
            // here confirms that the badge is removed but the andThen is firing
            // before the page is updated
            // andThen(() => {
            //     expect('[data-test-suspended-badge]').to.not.exist;
            // });

            await click('[data-test-team-link]');
            // suspendedUser is now in active list
            expect(
                find(`[data-test-active-users] [data-test-user-id="${suspendedUser.id}"]`)
            ).to.exist;

            // no suspended users
            expect(
                find('[data-test-suspended-users] [data-test-user-id]').length
            ).to.equal(0);

            await click(`[data-test-user-id="${suspendedUser.id}"]`);

            await click('[data-test-user-actions]');
            await click('[data-test-suspend-button]');
            await click('[data-test-modal-confirm]');
            expect(find('[data-test-suspended-badge]')).to.exist;
        });

        it('can delete users', async function () {
            let user1 = server.create('user');
            let user2 = server.create('user');
            let post = server.create('post');

            user2.posts = [post];

            await visit('/team');
            await click(`[data-test-user-id="${user1.id}"]`);

            // user deletion displays modal
            await click('button.delete');
            expect(
                find('.fullscreen-modal .modal-content:contains("delete this user")').length,
                'user deletion modal displayed after button click'
            ).to.equal(1);

            // user has no posts so no warning about post deletion
            expect(
                find('.fullscreen-modal .modal-content:contains("is the author of")').length,
                'deleting user with no posts has no post count'
            ).to.equal(0);

            // cancelling user deletion closes modal
            await click('.fullscreen-modal button:contains("Cancel")');
            expect(
                find('.fullscreen-modal').length === 0,
                'delete user modal is closed when cancelling'
            ).to.be.true;

            // deleting a user with posts
            await visit('/team');
            await click(`[data-test-user-id="${user2.id}"]`);

            await click('button.delete');
            // user has  posts so should warn about post deletion
            expect(
                find('.fullscreen-modal .modal-content:contains("1 post created by this user")').length,
                'deleting user with posts has post count'
            ).to.equal(1);

            await click('.fullscreen-modal button:contains("Delete")');
            // redirected to team page
            expect(currentURL()).to.equal('/team');

            // deleted user is not in list
            expect(
                find(`[data-test-user-id="${user2.id}"]`).length,
                'deleted user is not in user list after deletion'
            ).to.equal(0);
        });

        describe('existing user', function () {
            let user, newLocation, originalReplaceState;

            beforeEach(function () {
                user = server.create('user', {
                    slug: 'test-1',
                    name: 'Test User',
                    facebook: 'test',
                    twitter: '@test'
                });

                originalReplaceState = windowProxy.replaceState;
                windowProxy.replaceState = function (params, title, url) {
                    newLocation = url;
                };
                newLocation = undefined;
            });

            afterEach(function () {
                windowProxy.replaceState = originalReplaceState;
            });

            it('input fields reset and validate correctly', async function () {
                // test user name
                await visit('/team/test-1');

                expect(currentURL(), 'currentURL').to.equal('/team/test-1');
                expect(find('[data-test-name-input]').val(), 'current user name').to.equal('Test User');

                expect(find('[data-test-save-button]').text().trim(), 'save button text').to.equal('Save');

                // test empty user name
                await fillIn('[data-test-name-input]', '');
                await triggerEvent('[data-test-name-input]', 'blur');

                expect(find('.user-details-bottom .first-form-group').hasClass('error'), 'username input is in error state with blank input').to.be.true;

                // test too long user name
                await fillIn('[data-test-name-input]', new Array(195).join('a'));
                await triggerEvent('[data-test-name-input]', 'blur');

                expect(find('.user-details-bottom .first-form-group').hasClass('error'), 'username input is in error state with too long input').to.be.true;

                // reset name field
                await fillIn('[data-test-name-input]', 'Test User');

                expect(find('[data-test-slug-input]').val(), 'slug value is default').to.equal('test-1');

                await fillIn('[data-test-slug-input]', '');
                await triggerEvent('[data-test-slug-input]', 'blur');

                expect(find('[data-test-slug-input]').val(), 'slug value is reset to original upon empty string').to.equal('test-1');

                // Save changes
                await click('[data-test-save-button]');

                expect(find('[data-test-save-button]').text().trim(), 'save button text').to.equal('Saved');

                // CMD-S shortcut works
                await fillIn('[data-test-slug-input]', 'Test User');
                await triggerEvent('.gh-app', 'keydown', {
                    keyCode: 83, // s
                    metaKey: ctrlOrCmd === 'command',
                    ctrlKey: ctrlOrCmd === 'ctrl'
                });

                // we've already saved in this test so there's no on-screen indication
                // that we've had another save, check the request was fired instead
                let [lastRequest] = server.pretender.handledRequests.slice(-1);
                let params = JSON.parse(lastRequest.requestBody);

                expect(params.users[0].name).to.equal('Test User');

                // check that the history state has been updated
                expect(newLocation).to.equal('Test User');

                await fillIn('[data-test-slug-input]', 'white space');
                await triggerEvent('[data-test-slug-input]', 'blur');

                expect(find('[data-test-slug-input]').val(), 'slug value is correctly dasherized').to.equal('white-space');

                await fillIn('[data-test-email-input]', 'thisisnotanemail');
                await triggerEvent('[data-test-email-input]', 'blur');

                expect(find('.user-details-bottom .form-group:nth-of-type(3)').hasClass('error'), 'email input should be in error state with invalid email').to.be.true;

                await fillIn('[data-test-email-input]', 'test@example.com');
                await fillIn('[data-test-location-input]', new Array(160).join('a'));
                await triggerEvent('[data-test-location-input]', 'blur');

                expect(find('[data-test-location-input]').closest('.form-group').hasClass('error'), 'location input should be in error state').to.be.true;

                await fillIn('[data-test-location-input]', '');
                await fillIn('[data-test-website-input]', 'thisisntawebsite');
                await triggerEvent('[data-test-website-input]', 'blur');

                expect(find('[data-test-website-input]').closest('.form-group').hasClass('error'), 'website input should be in error state').to.be.true;

                let testSocialInput = async function (type, input, expectedValue, expectedError = '') {
                    await fillIn(`[data-test-${type}-input]`, input);
                    await triggerEvent(`[data-test-${type}-input]`, 'blur');

                    expect(
                        find(`[data-test-${type}-input]`).val(),
                        `${type} value for ${input}`
                    ).to.equal(expectedValue);

                    expect(
                        find(`[data-test-${type}-error]`).text().trim(),
                        `${type} validation response for ${input}`
                    ).to.equal(expectedError);

                    expect(
                        find(`[data-test-${type}-input]`).closest('.form-group').hasClass('error'),
                        `${type} input should be in error state with '${input}'`
                    ).to.equal(!!expectedError);
                };

                let testFacebookValidation = async (...args) => testSocialInput('facebook', ...args);
                let testTwitterValidation = async (...args) => testSocialInput('twitter', ...args);

                // Testing Facebook input

                // displays initial value
                expect(find('[data-test-facebook-input]').val(), 'initial facebook value')
                    .to.equal('https://www.facebook.com/test');

                await triggerEvent('[data-test-facebook-input]', 'focus');
                await triggerEvent('[data-test-facebook-input]', 'blur');

                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find('[data-test-facebook-input]').val(), 'facebook value after blur with no change')
                    .to.equal('https://www.facebook.com/test');

                await testFacebookValidation(
                    'facebook.com/username',
                    'https://www.facebook.com/username');

                await testFacebookValidation(
                    'testuser',
                    'https://www.facebook.com/testuser');

                await testFacebookValidation(
                    'ab99',
                    'https://www.facebook.com/ab99');

                await testFacebookValidation(
                    'page/ab99',
                    'https://www.facebook.com/page/ab99');

                await testFacebookValidation(
                    'page/*(&*(%%))',
                    'https://www.facebook.com/page/*(&*(%%))');

                await testFacebookValidation(
                    'facebook.com/pages/some-facebook-page/857469375913?ref=ts',
                    'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');

                await testFacebookValidation(
                    'https://www.facebook.com/groups/savethecrowninn',
                    'https://www.facebook.com/groups/savethecrowninn');

                await testFacebookValidation(
                    'http://github.com/username',
                    'http://github.com/username',
                    'The URL must be in a format like https://www.facebook.com/yourPage');

                await testFacebookValidation(
                    'http://github.com/pages/username',
                    'http://github.com/pages/username',
                    'The URL must be in a format like https://www.facebook.com/yourPage');

                // Testing Twitter input

                // loads fixtures and performs transform
                expect(find('[data-test-twitter-input]').val(), 'initial twitter value')
                    .to.equal('https://twitter.com/test');

                await triggerEvent('[data-test-twitter-input]', 'focus');
                await triggerEvent('[data-test-twitter-input]', 'blur');

                // regression test: we still have a value after the input is
                // focused and then blurred without any changes
                expect(find('[data-test-twitter-input]').val(), 'twitter value after blur with no change')
                    .to.equal('https://twitter.com/test');

                await testTwitterValidation(
                    'twitter.com/username',
                    'https://twitter.com/username');

                await testTwitterValidation(
                    'testuser',
                    'https://twitter.com/testuser');

                await testTwitterValidation(
                    'http://github.com/username',
                    'https://twitter.com/username');

                await testTwitterValidation(
                    '*(&*(%%))',
                    '*(&*(%%))',
                    'The URL must be in a format like https://twitter.com/yourUsername');

                await testTwitterValidation(
                    'thisusernamehasmorethan15characters',
                    'thisusernamehasmorethan15characters',
                    'Your Username is not a valid Twitter Username');

                // Testing bio input

                await fillIn('[data-test-website-input]', '');
                await fillIn('[data-test-bio-input]', new Array(210).join('a'));
                await triggerEvent('[data-test-bio-input]', 'blur');

                expect(find('[data-test-bio-input]').closest('.form-group').hasClass('error'), 'bio input should be in error state').to.be.true;

                // password reset ------

                // button triggers validation
                await click('[data-test-save-pw-button]');

                expect(
                    find('[data-test-new-pass-input]').closest('.form-group').hasClass('error'),
                    'new password has error class when blank'
                ).to.be.true;

                expect(
                    find('[data-test-new-pass-input]').siblings('.response').text(),
                    'new password error when blank'
                ).to.match(/can't be blank/);

                // validates too short password (< 10 characters)
                await fillIn('[data-test-new-pass-input]', 'notlong');
                await fillIn('[data-test-ne2-pass-input]', 'notlong');

                // enter key triggers action
                await keyEvent('[data-test-new-pass-input]', 'keyup', 13);

                expect(
                    find('[data-test-new-pass-input]').closest('.form-group').hasClass('error'),
                    'new password has error class when password too short'
                ).to.be.true;

                expect(
                    find('[data-test-new-pass-input]').siblings('.response').text(),
                    'confirm password error when it\'s too short'
                ).to.match(/at least 10 characters long/);

                // validates unsafe password
                await fillIn('#user-password-new', 'ghostisawesome');
                await fillIn('#user-new-password-verification', 'ghostisawesome');

                // enter key triggers action
                await keyEvent('#user-password-new', 'keyup', 13);

                expect(
                    find('#user-password-new').closest('.form-group').hasClass('error'),
                    'new password has error class when password is insecure'
                ).to.be.true;

                expect(
                    find('#user-password-new').siblings('.response').text(),
                    'confirm password error when it\'s insecure'
                ).to.match(/you cannot use an insecure password/);

                // typing in inputs clears validation
                await fillIn('[data-test-new-pass-input]', 'thisissupersafe');
                await triggerEvent('[data-test-new-pass-input]', 'input');

                expect(
                    find('[data-test-new-pass-input]').closest('.form-group').hasClass('error'),
                    'password validation is visible after typing'
                ).to.be.false;

                // enter key triggers action
                await keyEvent('[data-test-new-pass-input]', 'keyup', 13);

                expect(
                    find('[data-test-ne2-pass-input]').closest('.form-group').hasClass('error'),
                    'confirm password has error class when it doesn\'t match'
                ).to.be.true;

                expect(
                    find('[data-test-ne2-pass-input]').siblings('.response').text(),
                    'confirm password error when it doesn\'t match'
                ).to.match(/do not match/);

                // submits with correct details
                await fillIn('[data-test-ne2-pass-input]', 'thisissupersafe');
                await click('[data-test-save-pw-button]');

                // hits the endpoint
                let [newRequest] = server.pretender.handledRequests.slice(-1);
                params = JSON.parse(newRequest.requestBody);

                expect(newRequest.url, 'password request URL')
                    .to.match(/\/users\/password/);

                // eslint-disable-next-line camelcase
                expect(params.password[0].user_id).to.equal(user.id.toString());
                expect(params.password[0].newPassword).to.equal('thisissupersafe');
                expect(params.password[0].ne2Password).to.equal('thisissupersafe');

                // clears the fields
                expect(
                    find('[data-test-new-pass-input]').val(),
                    'password field after submit'
                ).to.be.blank;

                expect(
                    find('[data-test-ne2-pass-input]').val(),
                    'password verification field after submit'
                ).to.be.blank;

                // displays a notification
                expect(
                    find('.gh-notifications .gh-notification').length,
                    'password saved notification is displayed'
                ).to.equal(1);
            });

            it('warns when leaving without saving', async function () {
                await visit('/team/test-1');

                expect(currentURL(), 'currentURL').to.equal('/team/test-1');

                await fillIn('[data-test-slug-input]', 'another slug');
                await triggerEvent('[data-test-slug-input]', 'blur');

                expect(find('[data-test-slug-input]').val()).to.be.equal('another-slug');

                await fillIn('[data-test-facebook-input]', 'testuser');
                await triggerEvent('[data-test-facebook-input]', 'blur');

                expect(find('[data-test-facebook-input]').val()).to.be.equal('https://www.facebook.com/testuser');

                await visit('/settings/team');

                expect(find('.fullscreen-modal').length, 'modal exists').to.equal(1);

                // Leave without saving
                await (click('.fullscreen-modal [data-test-leave-button]'), 'leave without saving');

                expect(currentURL(), 'currentURL').to.equal('/settings/team');

                await visit('/team/test-1');

                expect(currentURL(), 'currentURL').to.equal('/team/test-1');

                // settings were not saved
                expect(find('[data-test-slug-input]').val()).to.be.equal('test-1');
                expect(find('[data-test-facebook-input]').val()).to.be.equal('https://www.facebook.com/test');
            });
        });

        describe('own user', function () {
            it('requires current password when changing password', async function () {
                await visit(`/team/${admin.slug}`);

                // test the "old password" field is validated
                await click('[data-test-save-pw-button]');

                // old password has error
                expect(
                    find('[data-test-old-pass-input]').closest('.form-group').hasClass('error'),
                    'old password has error class when blank'
                ).to.be.true;

                expect(
                    find('[data-test-old-pass-input]').siblings('.response').text(),
                    'old password error when blank'
                ).to.match(/is required/);

                // new password has error
                expect(
                    find('[data-test-new-pass-input]').closest('.form-group').hasClass('error'),
                    'new password has error class when blank'
                ).to.be.true;

                expect(
                    find('[data-test-new-pass-input]').siblings('.response').text(),
                    'new password error when blank'
                ).to.match(/can't be blank/);

                // validation is cleared when typing
                await fillIn('[data-test-old-pass-input]', 'password');
                await triggerEvent('[data-test-old-pass-input]', 'input');

                expect(
                    find('[data-test-old-pass-input]').closest('.form-group').hasClass('error'),
                    'old password validation is in error state after typing'
                ).to.be.false;
            });
        });

        it('redirects to 404 when user does not exist', async function () {
            server.get('/users/slug/unknown/', function () {
                return new Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'User not found.', errorType: 'NotFoundError'}]});
            });

            errorOverride();

            await visit('/team/unknown');

            errorReset();
            expect(currentPath()).to.equal('error404');
            expect(currentURL()).to.equal('/team/unknown');
        });
    });

    describe('when logged in as author', function () {
        let adminRole, authorRole;

        beforeEach(function () {
            adminRole = server.create('role', {name: 'Administrator'});
            authorRole = server.create('role', {name: 'Author'});
            server.create('user', {roles: [authorRole]});

            server.get('/invites/', function () {
                return new Response(403, {}, {
                    errors: [{
                        errorType: 'NoPermissionError',
                        message: 'You do not have permission to perform this action'
                    }]
                });
            });

            return authenticateSession(application);
        });

        it('can access the team page', async function () {
            server.create('user', {roles: [adminRole]});
            server.create('invite', {roles: [authorRole]});

            errorOverride();

            await visit('/team');

            errorReset();
            expect(currentPath()).to.equal('team.index');
            expect(find('.gh-alert').length).to.equal(0);
        });
    });
});
