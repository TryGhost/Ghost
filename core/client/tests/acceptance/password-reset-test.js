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

describe('Acceptance: Password Reset', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    describe('request reset', function () {
        it('is successful with valid data', function () {
            visit('/signin');
            fillIn('input[name="identification"]', 'test@example.com');
            click('.forgotten-link');

            andThen(function () {
                // an alert with instructions is displayed
                expect(find('.gh-alert-blue').length, 'alert count')
                    .to.equal(1);
            });
        });

        it('shows error messages with invalid data', function () {
            visit('/signin');

            // no email provided
            click('.forgotten-link');

            andThen(function () {
                // email field is invalid
                expect(
                    find('input[name="identification"]').closest('.form-group').hasClass('error'),
                    'email field has error class (no email)'
                ).to.be.true;

                // password field is valid
                expect(
                    find('input[name="password"]').closest('.form-group').hasClass('error'),
                    'password field has error class (no email)'
                ).to.be.false;

                // error message shown
                expect(find('p.main-error').text().trim(), 'error message')
                    .to.equal('We need your email address to reset your password!');
            });

            // invalid email provided
            fillIn('input[name="identification"]', 'test');
            click('.forgotten-link');

            andThen(function () {
                // email field is invalid
                expect(
                    find('input[name="identification"]').closest('.form-group').hasClass('error'),
                    'email field has error class (invalid email)'
                ).to.be.true;

                // password field is valid
                expect(
                    find('input[name="password"]').closest('.form-group').hasClass('error'),
                    'password field has error class (invalid email)'
                ).to.be.false;

                // error message
                expect(find('p.main-error').text().trim(), 'error message')
                    .to.equal('We need your email address to reset your password!');
            });

            // unknown email provided
            fillIn('input[name="identification"]', 'unknown@example.com');
            click('.forgotten-link');

            andThen(function () {
                // email field is invalid
                expect(
                    find('input[name="identification"]').closest('.form-group').hasClass('error'),
                    'email field has error class (unknown email)'
                ).to.be.true;

                // password field is valid
                expect(
                    find('input[name="password"]').closest('.form-group').hasClass('error'),
                    'password field has error class (unknown email)'
                ).to.be.false;

                // error message
                expect(find('p.main-error').text().trim(), 'error message')
                    .to.equal('There is no user with that email address.');
            });
        });
    });

    // TODO: add tests for the change password screen
});
