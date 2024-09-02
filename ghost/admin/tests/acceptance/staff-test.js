// import moment from 'moment-timezone';
// import windowProxy from 'ghost-admin/utils/window-proxy';
// import {Response} from 'miragejs';
// import {afterEach, beforeEach, describe, it} from 'mocha';
// import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
// import {
//     blur,
//     click,
//     currentRouteName,
//     currentURL,
//     fillIn,
//     find,
//     findAll,
//     focus,
//     triggerEvent
// } from '@ember/test-helpers';
// import {enableLabsFlag} from '../helpers/labs-flag';
// import {enableMembers} from '../helpers/members';
// import {enableStripe} from '../helpers/stripe';
// import {expect} from 'chai';
// import {keyDown} from 'ember-keyboard/test-support/test-helpers';
// import {setupApplicationTest} from 'ember-mocha';
// import {setupMirage} from 'ember-cli-mirage/test-support';
// import {submitForm} from '../helpers/forms';
// import {visit} from '../helpers/visit';

// describe('Acceptance: Staff', function () {
//     let hooks = setupApplicationTest();
//     setupMirage(hooks);

//     it('redirects to signin when not authenticated', async function () {
//         await invalidateSession();
//         await visit('/settings/staff');

//         expect(currentURL()).to.equal('/signin');
//     });

//     it('redirects correctly when authenticated as contributor', async function () {
//         let role = this.server.create('role', {name: 'Contributor'});
//         this.server.create('user', {roles: [role], slug: 'test-user'});

//         this.server.create('user', {slug: 'no-access'});

//         await authenticateSession();
//         await visit('/settings/staff/no-access');

//         expect(currentURL(), 'currentURL').to.equal('/settings/staff/test-user');
//     });

//     it('redirects correctly when authenticated as author', async function () {
//         let role = this.server.create('role', {name: 'Author'});
//         this.server.create('user', {roles: [role], slug: 'test-user'});

//         this.server.create('user', {slug: 'no-access'});

//         await authenticateSession();
//         await visit('/settings/staff/no-access');

//         expect(currentURL(), 'currentURL').to.equal('/settings/staff/test-user');
//     });

//     it('redirects correctly when authenticated as editor', async function () {
//         let role = this.server.create('role', {name: 'Editor'});
//         this.server.create('user', {roles: [role], slug: 'test-user'});

//         this.server.create('user', {slug: 'no-access'});

//         await authenticateSession();
//         await visit('/settings/staff/no-access');

//         expect(currentURL(), 'currentURL').to.equal('/settings/staff');
//     });

//     describe('when logged in as admin', function () {
//         let admin, adminRole, suspendedUser;

//         beforeEach(async function () {
//             this.server.loadFixtures('roles');
//             this.server.loadFixtures('settings');
//             adminRole = this.server.schema.roles.find(1);
//             enableMembers(this.server);
//             enableStripe(this.server);
//             enableLabsFlag(this.server, 'webmentions');

//             admin = this.server.create('user', {email: 'admin@example.com', roles: [adminRole]});

//             // add an expired invite
//             this.server.create('invite', {expires: moment.utc().subtract(1, 'day').valueOf(), role: adminRole});

//             // add a suspended user
//             suspendedUser = this.server.create('user', {email: 'suspended@example.com', roles: [adminRole], status: 'inactive'});

//             await authenticateSession();
//         });

//         it('it renders and navigates correctly', async function () {
//             let user1 = this.server.create('user');
//             let user2 = this.server.create('user');

//             await visit('/settings/staff');

//             // doesn't do any redirecting
//             expect(currentURL(), 'currentURL').to.equal('/settings/staff');

//             // it shows active users in active section
//             expect(
//                 findAll('[data-test-active-users] [data-test-user-id]').length,
//                 'number of active users'
//             ).to.equal(3);
//             expect(
//                 find(`[data-test-active-users] [data-test-user-id="${user1.id}"]`)
//             ).to.exist;
//             expect(
//                 find(`[data-test-active-users] [data-test-user-id="${user2.id}"]`)
//             ).to.exist;
//             expect(
//                 find(`[data-test-active-users] [data-test-user-id="${admin.id}"]`)
//             ).to.exist;

//             // it shows suspended users in suspended section
//             expect(
//                 findAll('[data-test-suspended-users] [data-test-user-id]').length,
//                 'number of suspended users'
//             ).to.equal(1);
//             expect(
//                 find(`[data-test-suspended-users] [data-test-user-id="${suspendedUser.id}"]`)
//             ).to.exist;

//             await click(`[data-test-user-id="${user2.id}"]`);

//             // url is correct
//             expect(currentURL(), 'url after clicking user').to.equal(`/settings/staff/${user2.slug}`);

//             // view title should exist and be linkable and active
//             expect(
//                 find('[data-test-breadcrumb] a[href="/ghost/settings/staff"]').classList.contains('active'),
//                 'has linkable url back to staff main page'
//             ).to.be.true;

//             await click('[data-test-breadcrumb] a');

//             // url should be /staff again
//             expect(currentURL(), 'url after clicking back').to.equal('/settings');
//         });

//         it('can manage invites', async function () {
//             await visit('/settings/staff');

//             // invite user button exists
//             expect(
//                 find('.view-actions .gh-btn-primary'),
//                 'invite people button'
//             ).to.exist;

//             // existing users are listed
//             expect(
//                 findAll('[data-test-user-id]').length,
//                 'initial number of active users'
//             ).to.equal(2);

//             expect(
//                 find('[data-test-user-id="1"] [data-test-role-name]').textContent.trim(),
//                 'active user\'s role label'
//             ).to.equal('Administrator');

//             // existing invites are shown
//             expect(
//                 findAll('[data-test-invite-id]').length,
//                 'initial number of invited users'
//             ).to.equal(1);

//             expect(
//                 find('[data-test-invite-id="1"] [data-test-invite-description]').textContent,
//                 'expired invite description'
//             ).to.match(/expired/);

//             // remove expired invite
//             await click('[data-test-invite-id="1"] [data-test-revoke-button]');

//             expect(
//                 findAll('[data-test-invite-id]').length,
//                 'initial number of invited users'
//             ).to.equal(0);

//             // click the invite people button
//             await click('[data-test-button="invite-staff-user"]');

//             // modal is displayed
//             expect(
//                 find('[data-test-modal="invite-staff-user"]'),
//                 'correct modal is displayed'
//             ).to.exist;

//             // number of roles is correct
//             expect(
//                 findAll('[data-test-option]').length,
//                 'number of selectable roles'
//             ).to.equal(4);

//             expect(
//                 find('[data-test-option="Contributor"]'),
//                 'contributor role is selected initially'
//             ).to.have.class('active');

//             // submit valid invite form
//             await fillIn('.fullscreen-modal input[name="email"]', 'invite1@example.com');
//             await click('[data-test-button="send-user-invite"]');

//             // modal closes
//             expect(
//                 findAll('[data-test-modal]').length,
//                 'number of modals after sending invite'
//             ).to.equal(0);

//             // invite is displayed, has correct e-mail + role
//             expect(
//                 findAll('[data-test-invite-id]').length,
//                 'number of invites after first invite'
//             ).to.equal(1);

//             expect(
//                 find('[data-test-invite-id="2"] [data-test-email]').textContent.trim(),
//                 'displayed email of first invite'
//             ).to.equal('invite1@example.com');

//             expect(
//                 find('[data-test-invite-id="2"] [data-test-role-name]').textContent.trim(),
//                 'displayed role of first invite'
//             ).to.equal('Contributor');

//             expect(
//                 find('[data-test-invite-id="2"] [data-test-invite-description]').textContent,
//                 'new invite description'
//             ).to.match(/expires/);

//             // number of users is unchanged
//             expect(
//                 findAll('[data-test-user-id]').length,
//                 'number of active users after first invite'
//             ).to.equal(2);

//             // submit new invite with different role
//             await click('.view-actions .gh-btn-primary');
//             await fillIn('.fullscreen-modal input[name="email"]', 'invite2@example.com');
//             await click('[data-test-option="Editor"]');
//             await click('[data-test-button="send-user-invite"]');

//             // number of invites increases
//             expect(
//                 findAll('[data-test-invite-id]').length,
//                 'number of invites after second invite'
//             ).to.equal(2);

//             // invite has correct e-mail + role
//             expect(
//                 find('[data-test-invite-id="3"] [data-test-email]').textContent.trim(),
//                 'displayed email of second invite'
//             ).to.equal('invite2@example.com');

//             expect(
//                 find('[data-test-invite-id="3"] [data-test-role-name]').textContent.trim(),
//                 'displayed role of second invite'
//             ).to.equal('Editor');

//             // submit invite form with existing user
//             await click('.view-actions .gh-btn-primary');
//             await fillIn('.fullscreen-modal input[name="email"]', 'admin@example.com');
//             await click('[data-test-button="send-user-invite"]');

//             // validation message is displayed
//             expect(
//                 find('.fullscreen-modal .error .response').textContent.trim(),
//                 'inviting existing user error'
//             ).to.equal('A user with that email address already exists.');

//             // submit invite form with existing invite
//             await fillIn('.fullscreen-modal input[name="email"]', 'invite1@example.com');
//             await click('[data-test-button="send-user-invite"]');

//             // validation message is displayed
//             expect(
//                 find('.fullscreen-modal .error .response').textContent.trim(),
//                 'inviting invited user error'
//             ).to.equal('A user with that email address was already invited.');

//             // submit invite form with an invalid email
//             await fillIn('.fullscreen-modal input[name="email"]', 'test');
//             await click('[data-test-button="send-user-invite"]');

//             // validation message is displayed
//             expect(
//                 find('.fullscreen-modal .error .response').textContent.trim(),
//                 'inviting invalid email error'
//             ).to.equal('Invalid Email.');

//             await click('.fullscreen-modal a.close');
//             // revoke latest invite
//             await click('[data-test-invite-id="3"] [data-test-revoke-button]');

//             // number of invites decreases
//             expect(
//                 findAll('[data-test-invite-id]').length,
//                 'number of invites after revoke'
//             ).to.equal(1);

//             // notification is displayed
//             expect(
//                 find('.gh-notification:last-of-type').textContent.trim(),
//                 'notifications contain revoke'
//             ).to.match(/Invitation revoked\s+invite2@example\.com/);

//             // correct invite is removed
//             expect(
//                 find('[data-test-invite-id] [data-test-email]').textContent.trim(),
//                 'displayed email of remaining invite'
//             ).to.equal('invite1@example.com');

//             // add another invite to test ordering on resend
//             await click('.view-actions .gh-btn-primary');
//             await fillIn('.fullscreen-modal input[name="email"]', 'invite3@example.com');
//             await click('[data-test-button="send-user-invite"]');

//             // new invite should be last in the list
//             expect(
//                 find('[data-test-invite-id]:last-of-type [data-test-email]').textContent.trim(),
//                 'last invite email in list'
//             ).to.equal('invite3@example.com');

//             // resend first invite
//             await click('[data-test-invite-id="2"] [data-test-resend-button]');

//             // notification is displayed
//             expect(
//                 find('.gh-notification:last-of-type').textContent.trim(),
//                 'notifications contain resend'
//             ).to.match(/Invitation resent! \(invite1@example\.com\)/);

//             // first invite is still at the top
//             expect(
//                 find('[data-test-invite-id]:first-of-type [data-test-email]').textContent.trim(),
//                 'first invite email in list'
//             ).to.equal('invite1@example.com');

//             // regression test: can revoke a resent invite
//             await click('[data-test-invite-id]:first-of-type [data-test-resend-button]');
//             await click('[data-test-invite-id]:first-of-type [data-test-revoke-button]');

//             // number of invites decreases
//             expect(
//                 findAll('[data-test-invite-id]').length,
//                 'number of invites after resend/revoke'
//             ).to.equal(1);

//             // notification is displayed
//             expect(
//                 find('.gh-notification:last-of-type').textContent.trim(),
//                 'notifications contain revoke after resend/revoke'
//             ).to.match(/Invitation revoked\s+invite1@example\.com/);
//         });

//         it('can manage suspended users', async function () {
//             await visit('/settings/staff');
//             await click(`[data-test-user-id="${suspendedUser.id}"]`);

//             expect(find('[data-test-suspended-badge]')).to.exist;

//             await click('[data-test-user-actions]');
//             await click('[data-test-unsuspend-button]');
//             await click('[data-test-modal-confirm]');

//             // NOTE: there seems to be a timing issue with this test - pausing
//             // here confirms that the badge is removed but the andThen is firing
//             // before the page is updated
//             // andThen(() => {
//             //     expect('[data-test-suspended-badge]').to.not.exist;
//             // });

//             await click('[data-test-staff-link]');
//             // suspendedUser is now in active list
//             expect(
//                 find(`[data-test-active-users] [data-test-user-id="${suspendedUser.id}"]`)
//             ).to.exist;

//             // no suspended users
//             expect(
//                 findAll('[data-test-suspended-users] [data-test-user-id]').length
//             ).to.equal(0);

//             await click(`[data-test-user-id="${suspendedUser.id}"]`);

//             await click('[data-test-user-actions]');
//             await click('[data-test-suspend-button]');
//             await click('[data-test-modal-confirm]');
//             expect(find('[data-test-suspended-badge]')).to.exist;
//         });

//         it('can delete users', async function () {
//             let user1 = this.server.create('user');
//             let user2 = this.server.create('user');
//             let post = this.server.create('post', {authors: [user2]});

//             // we don't have a full many-to-many relationship in mirage so we
//             // need to add the inverse manually
//             user2.posts = [post];
//             user2.save();

//             await visit('/settings/staff');
//             await click(`[data-test-user-id="${user1.id}"]`);

//             // user deletion displays modal
//             await click('button.delete');
//             expect(
//                 findAll('[data-test-modal="delete-user"]').length,
//                 'user deletion modal displayed after button click'
//             ).to.equal(1);

//             // user has no posts so no warning about post deletion
//             expect(
//                 findAll('[data-test-text="user-post-count"]').length,
//                 'deleting user with no posts has no post count'
//             ).to.equal(0);

//             // cancelling user deletion closes modal
//             await click('[data-test-button="cancel-delete-user"]');
//             expect(
//                 findAll('[data-test-modal]').length === 0,
//                 'delete user modal is closed when cancelling'
//             ).to.be.true;

//             // deleting a user with posts
//             await visit('/settings/staff');
//             await click(`[data-test-user-id="${user2.id}"]`);

//             await click('button.delete');
//             // user has  posts so should warn about post deletion
//             expect(
//                 find('[data-test-text="user-post-count"]').textContent,
//                 'deleting user with posts has post count'
//             ).to.have.string('1 post');

//             await click('[data-test-button="confirm-delete-user"]');
//             // redirected to staff page
//             expect(currentURL()).to.equal('/settings/staff');

//             // deleted user is not in list
//             expect(
//                 findAll(`[data-test-user-id="${user2.id}"]`).length,
//                 'deleted user is not in user list after deletion'
//             ).to.equal(0);
//         });

//         describe('existing user', function () {
//             let user, originalReplaceState;
//             let newLocation; // eslint-disable-line

//             beforeEach(function () {
//                 user = this.server.create('user', {
//                     slug: 'test-1',
//                     name: 'Test User',
//                     facebook: 'test',
//                     twitter: '@test'
//                 });

//                 originalReplaceState = windowProxy.replaceState;
//                 windowProxy.replaceState = function (params, title, url) {
//                     newLocation = url;
//                 };
//                 newLocation = undefined;
//             });

//             afterEach(function () {
//                 windowProxy.replaceState = originalReplaceState;
//             });

//             it('input fields reset and validate correctly', async function () {
//                 // test user name
//                 await visit('/settings/staff/test-1');

//                 expect(currentURL(), 'currentURL').to.equal('/settings/staff/test-1');
//                 expect(find('[data-test-name-input]').value, 'current user name').to.equal('Test User');

//                 expect(find('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');

//                 // test empty user name
//                 await fillIn('[data-test-name-input]', '');
//                 await blur('[data-test-name-input]');

//                 expect(find('.user-details-bottom .first-form-group').classList.contains('error'), 'username input is in error state with blank input').to.be.true;

//                 // test too long user name
//                 await fillIn('[data-test-name-input]', new Array(195).join('a'));
//                 await blur('[data-test-name-input]');

//                 expect(find('.user-details-bottom .first-form-group').classList.contains('error'), 'username input is in error state with too long input').to.be.true;

//                 // reset name field
//                 await fillIn('[data-test-name-input]', 'Test User');

//                 expect(find('[data-test-slug-input]').value, 'slug value is default').to.equal('test-1');

//                 await fillIn('[data-test-slug-input]', '');
//                 await blur('[data-test-slug-input]');

//                 expect(find('[data-test-slug-input]').value, 'slug value is reset to original upon empty string').to.equal('test-1');

//                 // Save changes
//                 await click('[data-test-save-button]');

//                 // Since we reset save button's status there's no on-screen indication
//                 // that we've had a save, check the request was fired instead
//                 let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
//                 let params = JSON.parse(lastRequest.requestBody);

//                 expect(params.users[0].name).to.equal('Test User');

//                 // CMD-S shortcut works
//                 await fillIn('[data-test-name-input]', 'New Name');
//                 await keyDown('cmd+s');

//                 // Since we reset save button's status there's no on-screen indication
//                 // that we've had a save, check the request was fired instead
//                 [lastRequest] = this.server.pretender.handledRequests.slice(-1);
//                 params = JSON.parse(lastRequest.requestBody);

//                 // name should have been correctly set before save (we set on blur)
//                 expect(params.users[0].name, 'saved name').to.equal('New Name');

//                 await fillIn('[data-test-slug-input]', 'white space');
//                 await blur('[data-test-slug-input]');

//                 expect(find('[data-test-slug-input]').value, 'slug value is correctly dasherized').to.equal('white-space');

//                 await fillIn('[data-test-email-input]', 'thisisnotanemail');
//                 await blur('[data-test-email-input]');

//                 expect(find('.user-details-bottom .form-group:nth-of-type(3)').classList.contains('error'), 'email input should be in error state with invalid email').to.be.true;

//                 await fillIn('[data-test-email-input]', 'test@example.com');
//                 await fillIn('[data-test-location-input]', new Array(160).join('a'));
//                 await blur('[data-test-location-input]');

//                 expect(
//                     find('[data-test-location-input]').closest('.form-group'),
//                     'location input should be in error state'
//                 ).to.have.class('error');

//                 await fillIn('[data-test-location-input]', '');
//                 await fillIn('[data-test-website-input]', 'thisisntawebsite');
//                 await blur('[data-test-website-input]');

//                 expect(
//                     find('[data-test-website-input]').closest('.form-group'),
//                     'website input should be in error state'
//                 ).to.have.class('error');

//                 let testSocialInput = async function (type, input, expectedValue, expectedError = '') {
//                     await fillIn(`[data-test-${type}-input]`, input);
//                     await blur(`[data-test-${type}-input]`);

//                     expect(
//                         find(`[data-test-${type}-input]`).value,
//                         `${type} value for ${input}`
//                     ).to.equal(expectedValue);

//                     expect(
//                         find(`[data-test-error="user-${type}"]`).textContent.trim(),
//                         `${type} validation response for ${input}`
//                     ).to.equal(expectedError);

//                     expect(
//                         find(`[data-test-error="user-${type}"]`).closest('.form-group').classList.contains('error'),
//                         `${type} input should be in error state with '${input}'`
//                     ).to.equal(!!expectedError);
//                 };

//                 let testFacebookValidation = async (...args) => testSocialInput('facebook', ...args);
//                 let testTwitterValidation = async (...args) => testSocialInput('twitter', ...args);

//                 // Testing Facebook input

//                 // displays initial value
//                 expect(find('[data-test-facebook-input]').value, 'initial facebook value')
//                     .to.equal('https://www.facebook.com/test');

//                 await focus('[data-test-facebook-input]');
//                 await blur('[data-test-facebook-input]');

//                 // regression test: we still have a value after the input is
//                 // focused and then blurred without any changes
//                 expect(find('[data-test-facebook-input]').value, 'facebook value after blur with no change')
//                     .to.equal('https://www.facebook.com/test');

//                 await testFacebookValidation(
//                     'facebook.com/username',
//                     'https://www.facebook.com/username');

//                 await testFacebookValidation(
//                     'testuser',
//                     'https://www.facebook.com/testuser');

//                 await testFacebookValidation(
//                     'ab99',
//                     'https://www.facebook.com/ab99');

//                 await testFacebookValidation(
//                     'page/ab99',
//                     'https://www.facebook.com/page/ab99');

//                 await testFacebookValidation(
//                     'page/*(&*(%%))',
//                     'https://www.facebook.com/page/*(&*(%%))');

//                 await testFacebookValidation(
//                     'facebook.com/pages/some-facebook-page/857469375913?ref=ts',
//                     'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');

//                 await testFacebookValidation(
//                     'https://www.facebook.com/groups/savethecrowninn',
//                     'https://www.facebook.com/groups/savethecrowninn');

//                 await testFacebookValidation(
//                     'http://github.com/username',
//                     'http://github.com/username',
//                     'The URL must be in a format like https://www.facebook.com/yourPage');

//                 await testFacebookValidation(
//                     'http://github.com/pages/username',
//                     'http://github.com/pages/username',
//                     'The URL must be in a format like https://www.facebook.com/yourPage');

//                 // Testing Twitter input

//                 // loads fixtures and performs transform
//                 expect(find('[data-test-twitter-input]').value, 'initial twitter value')
//                     .to.equal('https://twitter.com/test');

//                 await focus('[data-test-twitter-input]');
//                 await blur('[data-test-twitter-input]');

//                 // regression test: we still have a value after the input is
//                 // focused and then blurred without any changes
//                 expect(find('[data-test-twitter-input]').value, 'twitter value after blur with no change')
//                     .to.equal('https://twitter.com/test');

//                 await testTwitterValidation(
//                     'twitter.com/username',
//                     'https://twitter.com/username');

//                 await testTwitterValidation(
//                     'testuser',
//                     'https://twitter.com/testuser');

//                 await testTwitterValidation(
//                     'http://github.com/username',
//                     'https://twitter.com/username');

//                 await testTwitterValidation(
//                     '*(&*(%%))',
//                     '*(&*(%%))',
//                     'The URL must be in a format like https://twitter.com/yourUsername');

//                 await testTwitterValidation(
//                     'thisusernamehasmorethan15characters',
//                     'thisusernamehasmorethan15characters',
//                     'Your Username is not a valid Twitter Username');

//                 // Testing bio input

//                 await fillIn('[data-test-website-input]', '');
//                 await fillIn('[data-test-bio-input]', new Array(210).join('a'));
//                 await blur('[data-test-bio-input]');

//                 expect(
//                     find('[data-test-bio-input]').closest('.form-group'),
//                     'bio input should be in error state'
//                 ).to.have.class('error');

//                 // password reset ------

//                 // button triggers validation
//                 await click('[data-test-save-pw-button]');

//                 expect(
//                     find('[data-test-new-pass-input]').closest('.form-group'),
//                     'new password has error class when blank'
//                 ).to.have.class('error');

//                 expect(
//                     find('[data-test-error="user-new-pass"]').textContent,
//                     'new password error when blank'
//                 ).to.have.string('can\'t be blank');

//                 // validates too short password (< 10 characters)
//                 await fillIn('[data-test-new-pass-input]', 'notlong');
//                 await fillIn('[data-test-ne2-pass-input]', 'notlong');

//                 // enter key triggers action
//                 await submitForm('[data-test-new-pass-input]');

//                 expect(
//                     find('[data-test-new-pass-input]').closest('.form-group'),
//                     'new password has error class when password too short'
//                 ).to.have.class('error');

//                 expect(
//                     find('[data-test-error="user-new-pass"]').textContent,
//                     'new password error when it\'s too short'
//                 ).to.have.string('at least 10 characters long');

//                 // validates unsafe password
//                 await fillIn('#user-password-new', 'ghostisawesome');
//                 await fillIn('[data-test-ne2-pass-input]', 'ghostisawesome');

//                 // enter key triggers action
//                 await submitForm('#user-password-new');

//                 expect(
//                     find('#user-password-new').closest('.form-group'),
//                     'new password has error class when password is insecure'
//                 ).to.have.class('error');

//                 expect(
//                     find('[data-test-error="user-new-pass"]').textContent,
//                     'new password error when it\'s insecure'
//                 ).to.match(/you cannot use an insecure password/);

//                 // typing in inputs clears validation
//                 await fillIn('[data-test-new-pass-input]', 'thisissupersafe');
//                 await triggerEvent('[data-test-new-pass-input]', 'input');

//                 expect(
//                     find('[data-test-new-pass-input]').closest('.form-group'),
//                     'password validation is visible after typing'
//                 ).to.not.have.class('error');

//                 // enter key triggers action
//                 await submitForm('[data-test-new-pass-input]');

//                 expect(
//                     find('[data-test-ne2-pass-input]').closest('.form-group'),
//                     'confirm password has error class when it doesn\'t match'
//                 ).to.have.class('error');

//                 expect(
//                     find('[data-test-error="user-ne2-pass"]').textContent,
//                     'confirm password error when it doesn\'t match'
//                 ).to.have.string('do not match');

//                 // submits with correct details
//                 await fillIn('[data-test-ne2-pass-input]', 'thisissupersafe');
//                 await click('[data-test-save-pw-button]');

//                 // hits the endpoint
//                 let [newRequest] = this.server.pretender.handledRequests.slice(-1);
//                 params = JSON.parse(newRequest.requestBody);

//                 expect(newRequest.url, 'password request URL')
//                     .to.match(/\/users\/password/);

//                 // eslint-disable-next-line camelcase
//                 expect(params.password[0].user_id).to.equal(user.id.toString());
//                 expect(params.password[0].newPassword).to.equal('thisissupersafe');
//                 expect(params.password[0].ne2Password).to.equal('thisissupersafe');

//                 // clears the fields
//                 expect(
//                     find('[data-test-new-pass-input]').value,
//                     'password field after submit'
//                 ).to.be.empty;

//                 expect(
//                     find('[data-test-ne2-pass-input]').value,
//                     'password verification field after submit'
//                 ).to.be.empty;

//                 // displays a notification
//                 expect(
//                     findAll('.gh-notifications .gh-notification').length,
//                     'password saved notification is displayed'
//                 ).to.equal(1);
//             });

//             it('warns when leaving without saving', async function () {
//                 await visit('/settings/staff/test-1');

//                 expect(currentURL(), 'currentURL').to.equal('/settings/staff/test-1');

//                 await fillIn('[data-test-slug-input]', 'another slug');
//                 await blur('[data-test-slug-input]');

//                 expect(find('[data-test-slug-input]').value).to.be.equal('another-slug');

//                 await fillIn('[data-test-facebook-input]', 'testuser');
//                 await blur('[data-test-facebook-input]');

//                 expect(find('[data-test-facebook-input]').value).to.be.equal('https://www.facebook.com/testuser');

//                 await visit('/settings/staff');

//                 expect(findAll('[data-test-modal]').length, 'modal exists').to.equal(1);

//                 // Leave without saving
//                 await click('[data-test-modal="unsaved-settings"] [data-test-leave-button]');

//                 expect(currentURL(), 'currentURL').to.equal('/settings/staff');

//                 await visit('/settings/staff/test-1');

//                 expect(currentURL(), 'currentURL').to.equal('/settings/staff/test-1');

//                 // settings were not saved
//                 expect(find('[data-test-slug-input]').value).to.be.equal('test-1');
//                 expect(find('[data-test-facebook-input]').value).to.be.equal('https://www.facebook.com/test');
//             });

//             it('cannot see email alerts for other user', async function () {
//                 await visit('/settings/staff/test-1');
//                 expect(find('[data-test-checkbox="free-signup-notifications"]'), 'free signup alert').to.not.exist;
//                 expect(find('[data-test-checkbox="paid-started-notifications"]'), 'paid start alert').to.not.exist;
//                 expect(find('[data-test-checkbox="paid-canceled-notifications"]'), 'paid cancel alert').to.not.exist;
//             });
//         });

//         describe('own user', function () {
//             it('requires current password when changing password', async function () {
//                 await visit(`/settings/staff/${admin.slug}`);

//                 // test the "old password" field is validated
//                 await click('[data-test-save-pw-button]');

//                 // old password has error
//                 expect(
//                     find('[data-test-old-pass-input]').closest('.form-group'),
//                     'old password has error class when blank'
//                 ).to.have.class('error');

//                 expect(
//                     find('[data-test-error="user-old-pass"]').textContent,
//                     'old password error when blank'
//                 ).to.have.string('is required');

//                 // new password has error
//                 expect(
//                     find('[data-test-new-pass-input]').closest('.form-group'),
//                     'new password has error class when blank'
//                 ).to.have.class('error');

//                 expect(
//                     find('[data-test-error="user-new-pass"]').textContent,
//                     'new password error when blank'
//                 ).to.have.string('can\'t be blank');

//                 // validation is cleared when typing
//                 await fillIn('[data-test-old-pass-input]', 'password');
//                 await triggerEvent('[data-test-old-pass-input]', 'input');

//                 expect(
//                     find('[data-test-old-pass-input]').closest('.form-group'),
//                     'old password validation is in error state after typing'
//                 ).to.not.have.class('error');
//             });

//             it('can toggle email alerts for own user', async function () {
//                 await visit(`/settings/staff/${admin.slug}`);
//                 expect(find('[data-test-checkbox="free-signup-notifications"]')).to.not.be.checked;
//                 expect(find('[data-test-checkbox="paid-started-notifications"]')).to.not.be.checked;
//                 expect(find('[data-test-checkbox="paid-canceled-notifications"]')).to.not.be.checked;
//                 expect(find('[data-test-checkbox="mention-notifications"]')).to.not.be.checked;
//                 expect(find('[data-test-checkbox="milestone-notifications"]')).to.not.be.checked;

//                 await click('[data-test-label="free-signup-notifications"]');
//                 await click('[data-test-label="paid-started-notifications"]');
//                 await click('[data-test-label="paid-canceled-notifications"]');
//                 await click('[data-test-label="mention-notifications"]');
//                 await click('[data-test-label="milestone-notifications"]');
//                 await click('[data-test-save-button]');

//                 await visit(`/settings/staff/${admin.slug}`);

//                 expect(find('[data-test-checkbox="free-signup-notifications"]')).to.be.checked;
//                 expect(find('[data-test-checkbox="paid-started-notifications"]')).to.be.checked;
//                 expect(find('[data-test-checkbox="paid-canceled-notifications"]')).to.be.checked;
//                 expect(find('[data-test-checkbox="mention-notifications"]')).to.be.checked;
//                 expect(find('[data-test-checkbox="milestone-notifications"]')).to.be.checked;
//             });
//         });

//         it('redirects to 404 when user does not exist', async function () {
//             this.server.get('/users/slug/unknown/', function () {
//                 return new Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'User not found.', type: 'NotFoundError'}]});
//             });

//             await visit('/settings/staff/unknown');

//             expect(currentRouteName()).to.equal('error404');
//             expect(currentURL()).to.equal('/settings/staff/unknown');
//         });
//     });

//     describe('when logged in as owner', function () {
//         let admin, adminRole, ownerRole;

//         beforeEach(async function () {
//             this.server.loadFixtures('roles');
//             this.server.loadFixtures('settings');
//             adminRole = this.server.schema.roles.find(1);
//             enableMembers(this.server);
//             enableStripe(this.server);
//             ownerRole = this.server.create('role', {name: 'Owner'});

//             admin = this.server.create('user', {email: 'admin@example.com', roles: [ownerRole]});

//             // add an expired invite
//             this.server.create('invite', {expires: moment.utc().subtract(1, 'day').valueOf(), role: adminRole});

//             await authenticateSession();
//         });

//         describe('existing user', function () {
//             beforeEach(function () {
//                 this.server.create('user', {
//                     slug: 'test-1',
//                     name: 'Test User',
//                     facebook: 'test',
//                     twitter: '@test'
//                 });
//             });

//             it('cannot see email alerts for other user', async function () {
//                 await visit('/settings/staff/test-1');
//                 expect(find('[data-test-checkbox="free-signup-notifications"]'), 'free signup alert').to.not.exist;
//                 expect(find('[data-test-checkbox="paid-started-notifications"]'), 'paid start alert').to.not.exist;
//                 expect(find('[data-test-checkbox="paid-canceled-notifications"]'), 'paid cancel alert').to.not.exist;
//             });
//         });

//         describe('own user', function () {
//             it('can toggle email alerts for own user', async function () {
//                 await visit(`/settings/staff/${admin.slug}`);
//                 expect(find('[data-test-checkbox="free-signup-notifications"]')).to.not.be.checked;
//                 expect(find('[data-test-checkbox="paid-started-notifications"]')).to.not.be.checked;
//                 expect(find('[data-test-checkbox="paid-canceled-notifications"]')).to.not.be.checked;

//                 await click('[data-test-label="free-signup-notifications"]');
//                 await click('[data-test-label="paid-started-notifications"]');
//                 await click('[data-test-label="paid-canceled-notifications"]');

//                 await click('[data-test-save-button]');
//                 await visit(`/settings/staff/${admin.slug}`);

//                 expect(find('[data-test-checkbox="free-signup-notifications"]')).to.be.checked;
//                 expect(find('[data-test-checkbox="paid-started-notifications"]')).to.be.checked;
//                 expect(find('[data-test-checkbox="paid-canceled-notifications"]')).to.be.checked;
//             });
//         });
//     });

//     describe('when logged in as author', function () {
//         let adminRole, authorRole;

//         beforeEach(async function () {
//             adminRole = this.server.create('role', {name: 'Administrator'});
//             authorRole = this.server.create('role', {name: 'Author'});
//             this.server.create('user', {roles: [authorRole]});

//             this.server.get('/invites/', function () {
//                 return new Response(403, {}, {
//                     errors: [{
//                         type: 'NoPermissionError',
//                         message: 'You do not have permission to perform this action'
//                     }]
//                 });
//             });

//             await authenticateSession();
//         });

//         it('is redirected to user profile page', async function () {
//             this.server.create('user', {roles: [adminRole]});
//             this.server.create('invite', {role: authorRole});

//             await visit('/settings/staff');

//             expect(currentRouteName()).to.equal('settings.staff.user');
//             expect(findAll('.gh-alert').length).to.equal(0);
//         });
//     });
// });
