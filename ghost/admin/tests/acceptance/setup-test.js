/* jshint expr:true */
import destroyApp from '../helpers/destroy-app';
import moment from 'moment';
import startApp from '../helpers/start-app';
import testSelector from 'ember-test-selectors';
import {Response} from 'ember-cli-mirage';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from '../helpers/ember-simple-auth';
import {enableGhostOAuth} from '../helpers/configuration';
import {expect} from 'chai';
import {
    stubFailedOAuthConnect,
    stubSuccessfulOAuthConnect
} from '../helpers/oauth';

describe('Acceptance: Setup', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects if already authenticated', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession(application);

        await visit('/setup/one');
        expect(currentURL()).to.equal('/');

        await visit('/setup/two');
        expect(currentURL()).to.equal('/');

        await visit('/setup/three');
        expect(currentURL()).to.equal('/');
    });

    it('redirects to signin if already set up', async function () {
        // mimick an already setup blog
        server.get('/authentication/setup/', function () {
            return {
                setup: [
                    {status: true}
                ]
            };
        });

        await invalidateSession(application);

        await visit('/setup');
        expect(currentURL()).to.equal('/signin');
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

        it('has a successful happy path', async function () {
            invalidateSession(application);
            server.loadFixtures('roles');

            await visit('/setup');

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
            // and polling is disabled in testing so our count should be "1"
            expect(find('.gh-flow-content em').text().trim()).to.equal('1');

            await click('.gh-btn-green');

            // it transitions to step two
            expect(currentURL(), 'url after clicking "Create your account"')
                .to.equal('/setup/two');

            // email field is focused by default
            // NOTE: $('x').is(':focus') doesn't work in phantomjs CLI runner
            // https://github.com/ariya/phantomjs/issues/10427
            expect(find(testSelector('email-input')).get(0) === document.activeElement, 'email field has focus')
                .to.be.true;

            await click('.gh-btn-green');

            // it marks fields as invalid
            expect(find('.form-group.error').length, 'number of invalid fields')
                .to.equal(4);

            // it displays error messages
            expect(find('.error .response').length, 'number of in-line validation messages')
                .to.equal(4);

            // it displays main error
            expect(find('.main-error').length, 'main error is displayed')
                .to.equal(1);

            // enter valid details and submit
            await fillIn(testSelector('email-input'), 'test@example.com');
            await fillIn(testSelector('name-input'), 'Test User');
            await fillIn(testSelector('password-input'), 'password');
            await fillIn(testSelector('blog-title-input'), 'Blog Title');
            await click('.gh-btn-green');

            // it transitions to step 3
            expect(currentURL(), 'url after submitting step two')
                .to.equal('/setup/three');

            // submit button is "disabled"
            expect(find('button[type="submit"]').hasClass('gh-btn-green'), 'invite button with no emails is white')
                .to.be.false;

            // fill in a valid email
            await fillIn('[name="users"]', 'new-user@example.com');

            // submit button is "enabled"
            expect(find('button[type="submit"]').hasClass('gh-btn-green'), 'invite button is green with valid email address')
                .to.be.true;

            // submit the invite form
            await click('button[type="submit"]');

            // it redirects to the home / "content" screen
            expect(currentURL(), 'url after submitting invites')
                .to.equal('/');

            // it displays success alert
            expect(find('.gh-alert-green').length, 'number of success alerts')
                .to.equal(1);
        });

        it('handles validation errors in step 2', async function () {
            let postCount = 0;

            invalidateSession(application);
            server.loadFixtures('roles');

            server.post('/authentication/setup', function () {
                postCount++;

                // validation error
                if (postCount === 1) {
                    return new Response(422, {}, {
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
                    return new Response(500, {}, null);
                }
            });

            await visit('/setup/two');
            await click('.gh-btn-green');

            // non-server validation
            expect(find('.main-error').text().trim(), 'error text')
                .to.not.be.blank;

            await fillIn(testSelector('email-input'), 'test@example.com');
            await fillIn(testSelector('name-input'), 'Test User');
            await fillIn(testSelector('password-input'), 'password');
            await fillIn(testSelector('blog-title-input'), 'Blog Title');

            // first post - simulated validation error
            await click('.gh-btn-green');

            expect(find('.main-error').text().trim(), 'error text')
                .to.equal('Server response message');

            // second post - simulated server error
            await click('.gh-btn-green');

            expect(find('.main-error').text().trim(), 'error text')
                .to.be.blank;

            expect(find('.gh-alert-red').length, 'number of alerts')
                .to.equal(1);
        });

        it('handles invalid origin error on step 2', async function () {
            // mimick the API response for an invalid origin
            server.post('/authentication/token', function () {
                return new Response(401, {}, {
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

            await visit('/setup/two');
            await fillIn(testSelector('email-input'), 'test@example.com');
            await fillIn(testSelector('name-input'), 'Test User');
            await fillIn(testSelector('password-input'), 'password');
            await fillIn(testSelector('blog-title-input'), 'Blog Title');
            await click('.gh-btn-green');

            // button should not be spinning
            expect(find('.gh-btn-green .spinner').length, 'button has spinner')
                .to.equal(0);
            // we should show an error message
            expect(find('.main-error').text(), 'error text')
                .to.equal('Access Denied from url: unknown.com. Please use the url configured in config.js.');
        });

        it('handles validation errors in step 3', async function () {
            let input = '[name="users"]';
            let postCount = 0;
            let button, formGroup;

            invalidateSession(application);
            server.loadFixtures('roles');

            server.post('/invites', function ({invites}, request) {
                let [params] = JSON.parse(request.requestBody).invites;

                postCount++;

                // invalid
                if (postCount === 1) {
                    return new Response(422, {}, {
                        errors: [
                            {
                                errorType: 'ValidationError',
                                message: 'Dummy validation error'
                            }
                        ]
                    });
                }

                // TODO: duplicated from mirage/config/invites - extract method?
                /* eslint-disable camelcase */
                params.token = `${invites.all().models.length}-token`;
                params.expires = moment.utc().add(1, 'day').valueOf();
                params.created_at = moment.utc().format();
                params.created_by = 1;
                params.updated_at = moment.utc().format();
                params.updated_by = 1;
                params.status = 'sent';
                /* eslint-enable camelcase */

                return invites.create(params);
            });

            // complete step 2 so we can access step 3
            await visit('/setup/two');
            await fillIn(testSelector('email-input'), 'test@example.com');
            await fillIn(testSelector('name-input'), 'Test User');
            await fillIn(testSelector('password-input'), 'password');
            await fillIn(testSelector('blog-title-input'), 'Blog Title');
            await click('.gh-btn-green');

            // default field/button state
            formGroup = find('.gh-flow-invite .form-group');
            button = find('.gh-flow-invite button[type="submit"]');

            expect(formGroup.hasClass('error'), 'default field has error class')
                .to.be.false;

            expect(button.text().trim(), 'default button text')
                .to.equal('Invite some users');

            expect(button.hasClass('gh-btn-minor'), 'default button is disabled')
                .to.be.true;

            // no users submitted state
            await click('.gh-flow-invite button[type="submit"]');

            expect(formGroup.hasClass('error'), 'no users submitted field has error class')
                .to.be.true;

            expect(button.text().trim(), 'no users submitted button text')
                .to.equal('No users to invite');

            expect(button.hasClass('gh-btn-minor'), 'no users submitted button is disabled')
                .to.be.true;

            // single invalid email
            await fillIn(input, 'invalid email');
            await triggerEvent(input, 'blur');

            expect(formGroup.hasClass('error'), 'invalid field has error class')
                .to.be.true;

            expect(button.text().trim(), 'single invalid button text')
                .to.equal('1 invalid email address');

            expect(button.hasClass('gh-btn-minor'), 'invalid email button is disabled')
                .to.be.true;

            // multiple invalid emails
            await fillIn(input, 'invalid email\nanother invalid address');
            await triggerEvent(input, 'blur');

            expect(button.text().trim(), 'multiple invalid button text')
                .to.equal('2 invalid email addresses');

            // single valid email
            await fillIn(input, 'invited@example.com');
            await triggerEvent(input, 'blur');

            expect(formGroup.hasClass('error'), 'valid field has error class')
                .to.be.false;

            expect(button.text().trim(), 'single valid button text')
                .to.equal('Invite 1 user');

            expect(button.hasClass('gh-btn-green'), 'valid email button is enabled')
                .to.be.true;

            // multiple valid emails
            await fillIn(input, 'invited1@example.com\ninvited2@example.com');
            await triggerEvent(input, 'blur');

            expect(button.text().trim(), 'multiple valid button text')
                .to.equal('Invite 2 users');

            // submit invitations with simulated failure on 1 invite
            await click('.gh-btn-green');

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

    describe('using Ghost OAuth', function () {
        beforeEach(function () {
            // mimic a new install
            server.get('/authentication/setup/', function () {
                return {
                    setup: [
                        {status: false}
                    ]
                };
            });

            // ensure we have settings (to pass validation) and roles available
            enableGhostOAuth(server);
            server.loadFixtures('settings');
            server.loadFixtures('roles');
        });

        it('displays the connect form and validates', async function () {
            invalidateSession(application);

            await visit('/setup');

            // it redirects to step one
            expect(
                currentURL(),
                'url after accessing /setup'
            ).to.equal('/setup/one');

            await click('.gh-btn-green');

            expect(
                find('button.login').text().trim(),
                'login button text'
            ).to.equal('Sign in with Ghost');

            await click('.gh-btn-green');

            let sessionFG = find('button.login').closest('.form-group');
            let titleFG = find('input[name="blog-title"]').closest('.form-group');

            // session is validated
            expect(
                sessionFG.hasClass('error'),
                'session form group has error class'
            ).to.be.true;

            expect(
                sessionFG.find('.response').text().trim(),
                'session validation text'
            ).to.match(/Please connect a Ghost\.org account/i);

            // blog title is validated
            expect(
                titleFG.hasClass('error'),
                'title form group has error class'
            ).to.be.true;

            expect(
                titleFG.find('.response').text().trim(),
                'title validation text'
            ).to.match(/please enter a blog title/i);

            // TODO: test that connecting clears session validation error
            // TODO: test that typing in blog title clears validation error
        });

        it('can connect and setup successfully', async function () {
            stubSuccessfulOAuthConnect(application);

            await visit('/setup/two');
            await click('button.login');

            expect(
                find('button.login').text().trim(),
                'login button text when connected'
            ).to.equal('Connected: oauthtest@example.com');

            await fillIn('input[name="blog-title"]', 'Ghostbusters');
            await click(testSelector('submit-button'));

            expect(
                currentURL(),
                'url after submitting'
            ).to.equal('/setup/three');
        });

        it('handles failed connect', async function () {
            stubFailedOAuthConnect(application);

            await visit('/setup/two');
            await click('button.login');

            expect(
                find('.main-error').text().trim(),
                'error text after failed oauth connect'
            ).to.match(/authentication with ghost\.org denied or failed/i);
        });
    });
});
