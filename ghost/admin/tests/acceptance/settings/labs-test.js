import $ from 'jquery';
import destroyApp from '../../helpers/destroy-app';
import startApp from '../../helpers/start-app';
// import wait from 'ember-test-helpers/wait';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';
// import {timeout} from 'ember-concurrency';

describe('Acceptance: Settings - Labs', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    it('redirects to team page when authenticated as editor', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/labs');

        expect(currentURL(), 'currentURL').to.equal('/team');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it.skip('it renders, loads modals correctly', async function () {
            await visit('/settings/labs');

            // has correct url
            expect(currentURL(), 'currentURL').to.equal('/settings/labs');

            // has correct page title
            expect(document.title, 'page title').to.equal('Settings - Labs - Test Blog');

            // highlights nav menu
            expect($('.gh-nav-settings-labs').hasClass('active'), 'highlights nav menu item')
                .to.be.true;

            await click('#settings-resetdb .js-delete');
            expect(find('.fullscreen-modal .modal-content').length, 'modal element').to.equal(1);

            await click('.fullscreen-modal .modal-footer .gh-btn');
            expect(find('.fullscreen-modal').length, 'modal element').to.equal(0);
        });

        it('can upload/download redirects', async function () {
            await visit('/settings/labs');

            // successful upload
            server.post('/redirects/json/', {}, 200);

            await fileUpload(
                '[data-test-file-input="redirects"]',
                ['test'],
                {name: 'redirects.json', type: 'application/json'}
            );

            // TODO: tests for the temporary success/failure state have been
            // disabled because they were randomly failing

            // this should be half-way through button reset timeout
            // await timeout(50);
            //
            // // shows success button
            // let button = find('[data-test-button="upload-redirects"]');
            // expect(button.length, 'no of success buttons').to.equal(1);
            // expect(
            //     button.hasClass('gh-btn-green'),
            //     'success button is green'
            // ).to.be.true;
            // expect(
            //     button.text().trim(),
            //     'success button text'
            // ).to.have.string('Uploaded');
            //
            // await wait();

            // returned to normal button
            let button = find('[data-test-button="upload-redirects"]');
            expect(button.length, 'no of post-success buttons').to.equal(1);
            expect(
                button.hasClass('gh-btn-green'),
                'post-success button doesn\'t have success class'
            ).to.be.false;
            expect(
                button.text().trim(),
                'post-success button text'
            ).to.have.string('Upload redirects');

            // failed upload
            server.post('/redirects/json/', {
                errors: [{
                    errorType: 'BadRequestError',
                    message: 'Test failure message'
                }]
            }, 400);

            await fileUpload(
                '[data-test-file-input="redirects"]',
                ['test'],
                {name: 'redirects-bad.json', type: 'application/json'}
            );

            // TODO: tests for the temporary success/failure state have been
            // disabled because they were randomly failing

            // this should be half-way through button reset timeout
            // await timeout(50);
            //
            // shows failure button
            // button = find('[data-test-button="upload-redirects"]');
            // expect(button.length, 'no of failure buttons').to.equal(1);
            // expect(
            //     button.hasClass('gh-btn-red'),
            //     'failure button is red'
            // ).to.be.true;
            // expect(
            //     button.text().trim(),
            //     'failure button text'
            // ).to.have.string('Upload Failed');
            //
            // await wait();

            // shows error message
            expect(
                find('[data-test-error="redirects"]').text().trim(),
                'upload error text'
            ).to.have.string('Test failure message');

            // returned to normal button
            button = find('[data-test-button="upload-redirects"]');
            expect(button.length, 'no of post-failure buttons').to.equal(1);
            expect(
                button.hasClass('gh-btn-red'),
                'post-failure button doesn\'t have failure class'
            ).to.be.false;
            expect(
                button.text().trim(),
                'post-failure button text'
            ).to.have.string('Upload redirects');

            // successful upload clears error
            server.post('/redirects/json/', {}, 200);
            await fileUpload(
                '[data-test-file-input="redirects"]',
                ['test'],
                {name: 'redirects-bad.json', type: 'application/json'}
            );

            expect(find('[data-test-error="redirects"]')).to.not.exist;

            // can download redirects.json
            await click('[data-test-link="download-redirects"]');

            let iframe = $('#iframeDownload');
            expect(iframe.attr('src')).to.have.string('/redirects/json/');
        });
    });
});
