import {click, fillIn, find, findAll, visit} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {invalidateSession} from 'ember-simple-auth/test-support';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Password Reset', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    describe('request reset', function () {
        it('is successful with valid data', async function () {
            await invalidateSession();
            await visit('/signin');
            await fillIn('input[name="identification"]', 'test@example.com');
            await click('.forgotten-link');

            // an alert with instructions is displayed
            expect(findAll('.gh-alert-blue').length, 'alert count')
                .to.equal(1);
        });

        it('shows error messages with invalid data', async function () {
            await visit('/signin');

            // no email provided
            await click('.forgotten-link');

            // email field is invalid
            expect(
                find('input[name="identification"]').closest('.form-group'),
                'email field has error class (no email)'
            ).to.match('.error');

            // password field is valid
            expect(
                find('input[name="password"]').closest('.form-group'),
                'password field has error class (no email)'
            ).to.not.match('.error');

            // error message shown
            expect(find('p.main-error').textContent.trim(), 'error message')
                .to.equal('We need your email address to reset your password!');

            // invalid email provided
            await fillIn('input[name="identification"]', 'test');
            await click('.forgotten-link');

            // email field is invalid
            expect(
                find('input[name="identification"]').closest('.form-group'),
                'email field has error class (invalid email)'
            ).to.match('.error');

            // password field is valid
            expect(
                find('input[name="password"]').closest('.form-group'),
                'password field has error class (invalid email)'
            ).to.not.match('.error');

            // error message
            expect(find('p.main-error').textContent.trim(), 'error message')
                .to.equal('We need your email address to reset your password!');

            // unknown email provided
            await fillIn('input[name="identification"]', 'unknown@example.com');
            await click('.forgotten-link');

            // email field is invalid
            expect(
                find('input[name="identification"]').closest('.form-group'),
                'email field has error class (unknown email)'
            ).to.match('.error');

            // password field is valid
            expect(
                find('input[name="password"]').closest('.form-group'),
                'password field has error class (unknown email)'
            ).to.not.match('.error');

            // error message
            expect(find('p.main-error').textContent.trim(), 'error message')
                .to.equal('There is no user with that email address.');
        });
    });

    // TODO: add tests for the change password screen
});
