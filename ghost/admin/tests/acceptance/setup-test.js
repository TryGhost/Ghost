import {Response} from 'miragejs';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Setup', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects if already authenticated', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();

        await visit('/setup');
        expect(currentURL()).to.equal('/site');
    });

    it('redirects to signin if already set up', async function () {
        // mimick an already setup blog
        this.server.get('/authentication/setup/', function () {
            return {
                setup: [
                    {status: true}
                ]
            };
        });

        await invalidateSession();

        await visit('/setup');
        expect(currentURL()).to.equal('/signin');
    });

    describe('with a new blog', function () {
        beforeEach(function () {
            // mimick a new blog
            this.server.get('/authentication/setup/', function () {
                return {
                    setup: [
                        {status: false}
                    ]
                };
            });
        });

        it('has a successful happy path', async function () {
            await invalidateSession();
            this.server.loadFixtures('roles');

            await visit('/setup');

            // email field is focused by default
            // NOTE: $('x').is(':focus') doesn't work in phantomjs CLI runner
            // https://github.com/ariya/phantomjs/issues/10427
            expect(findAll('[data-test-blog-title-input]')[0] === document.activeElement, 'blog title has focus')
                .to.be.true;

            await click('[data-test-button="setup"]');

            // it marks fields as invalid
            expect(findAll('.form-group.error').length, 'number of invalid fields')
                .to.equal(4);

            // it displays error messages
            expect(findAll('.error .response').length, 'number of in-line validation messages')
                .to.equal(4);

            // it displays main error
            expect(findAll('.main-error').length, 'main error is displayed')
                .to.equal(1);

            // enter valid details and submit
            await fillIn('[data-test-email-input]', 'test@example.com');
            await fillIn('[data-test-name-input]', 'Test User');
            await fillIn('[data-test-password-input]', 'thisissupersafe');
            await fillIn('[data-test-blog-title-input]', 'Blog Title');
            await click('[data-test-button="setup"]');

            // it redirects to the dashboard
            expect(currentURL(), 'url after submitting account details')
                .to.equal('/dashboard');
        });

        it('handles validation errors in setup', async function () {
            let postCount = 0;

            await invalidateSession();
            this.server.loadFixtures('roles');

            this.server.post('/authentication/setup', function () {
                postCount += 1;

                // validation error
                if (postCount === 1) {
                    return new Response(422, {}, {
                        errors: [
                            {
                                type: 'ValidationError',
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

            await visit('/setup');
            await click('[data-test-button="setup"]');

            // non-server validation
            expect(find('.main-error').textContent.trim(), 'error text')
                .to.not.be.empty;

            await fillIn('[data-test-email-input]', 'test@example.com');
            await fillIn('[data-test-name-input]', 'Test User');
            await fillIn('[data-test-password-input]', 'thisissupersafe');
            await fillIn('[data-test-blog-title-input]', 'Blog Title');

            // first post - simulated validation error
            await click('[data-test-button="setup"]');

            expect(find('.main-error').textContent.trim(), 'error text')
                .to.equal('Server response message');

            // second post - simulated server error
            await click('[data-test-button="setup"]');

            expect(findAll('.main-error').length, 'main error is not displayed')
                .to.equal(0);

            expect(findAll('.gh-alert-red').length, 'number of alerts')
                .to.equal(1);
        });

        it('handles invalid origin error on setup', async function () {
            // mimick the API response for an invalid origin
            this.server.post('/session', function () {
                return new Response(401, {}, {
                    errors: [
                        {
                            type: 'UnauthorizedError',
                            message: 'Access Denied from url: unknown.com. Please use the url configured in config.js.'
                        }
                    ]
                });
            });

            await invalidateSession();
            this.server.loadFixtures('roles');

            await visit('/setup');
            await fillIn('[data-test-email-input]', 'test@example.com');
            await fillIn('[data-test-name-input]', 'Test User');
            await fillIn('[data-test-password-input]', 'thisissupersafe');
            await fillIn('[data-test-blog-title-input]', 'Blog Title');
            await click('[data-test-button="setup"]');

            // button should not be spinning
            expect(findAll('.gh-btn-signup .spinner').length, 'button has spinner')
                .to.equal(0);
            // we should show an error message
            expect(find('.main-error').textContent, 'error text')
                .to.have.string('Access Denied from url: unknown.com. Please use the url configured in config.js.');
        });
    });

    describe('?firstStart=true', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role], slug: 'owner'});

            await authenticateSession();
        });

        it('transitions to dashboard', async function () {
            await visit('/?firstStart=true');
            expect(currentURL()).to.equal('/dashboard');
        });
    });
});
