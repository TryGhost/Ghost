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
import { invalidateSession, authenticateSession } from 'ghost/tests/helpers/ember-simple-auth';

describe('Acceptance: Subscribers', function() {
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/subscribers');

        andThen(function () {
            expect(currentURL()).to.equal('/signin');
        });
    });

    it('redirects editors to posts', function () {
        let role = server.create('role', {name: 'Editor'});
        let user = server.create('user', {roles: [role]});

        authenticateSession(application);
        visit('/subscribers');

        andThen(function () {
            expect(currentURL()).to.equal('/');
            expect(find('.gh-nav-main a:contains("Subscribers")').length, 'sidebar link is visible')
                .to.equal(0);
        });
    });

    it('redirects authors to posts', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role]});

        authenticateSession(application);
        visit('/subscribers');

        andThen(function () {
            expect(currentURL()).to.equal('/');
            expect(find('.gh-nav-main a:contains("Subscribers")').length, 'sidebar link is visible')
                .to.equal(0);
        });
    });

    describe('an admin', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            server.loadFixtures();

            return authenticateSession(application);
        });

        it('can manage subscribers', function() {
            server.createList('subscriber', 40);

            authenticateSession(application);
            visit('/');
            click('.gh-nav-main a:contains("Subscribers")');

            andThen(function() {
                // it navigates to the correct page
                expect(currentPath()).to.equal('subscribers.index');

                // it has correct page title
                expect(document.title, 'page title')
                    .to.equal('Subscribers - Test Blog');

                // it loads the first page
                expect(find('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows')
                    .to.equal(30);

                // it shows the total number of subscribers
                expect(find('#total-subscribers').text().trim(), 'displayed subscribers total')
                    .to.equal('40');

                // scroll to the bottom of the table to simulate infinite scroll
                find('.subscribers-table').scrollTop(find('.subscribers-table .ember-light-table').height());
            });

            // trigger infinite scroll
            triggerEvent('.subscribers-table', 'scroll');

            andThen(function () {
                // it loads the next page
                expect(find('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows after infinite-scroll')
                    .to.equal(40);
            });

            // click the add subscriber button
            click('.btn:contains("Add Subscriber")');

            andThen(function () {
                // it displays the add subscriber modal
                expect(find('.fullscreen-modal').length, 'add subscriber modal displayed')
                    .to.equal(1);
            });

            // cancel the modal
            click('.fullscreen-modal .btn:contains("Cancel")');

            andThen(function () {
                // it closes the add subscriber modal
                expect(find('.fullscreen-modal').length, 'add subscriber modal displayed after cancel')
                    .to.equal(0);
            });

            // save a new subscriber
            click('.btn:contains("Add Subscriber")');
            fillIn('.fullscreen-modal input[name="email"]', 'test@example.com');
            click('.fullscreen-modal .btn:contains("Add")');

            andThen(function () {
                // the add subscriber modal is closed
                expect(find('.fullscreen-modal').length, 'add subscriber modal displayed after save')
                    .to.equal(0);

                // the subscriber is added to the table
                expect(find('.subscribers-table .lt-body .lt-row:first-of-type .lt-cell:first-of-type').text().trim(), 'first email in list after addition')
                    .to.equal('test@example.com');

                // the table is scrolled to the top
                // TODO: implement scroll to new record after addition
                // expect(find('.subscribers-table').scrollTop(), 'scroll position after addition')
                //     .to.equal(0);

                // the subscriber total is updated
                expect(find('#total-subscribers').text().trim(), 'subscribers total after addition')
                    .to.equal('41');
            });

            // click the import subscribers button
            click('.btn:contains("Import CSV")');

            andThen(function () {
                // it displays the import subscribers modal
                expect(find('.fullscreen-modal').length, 'import subscribers modal displayed')
                    .to.equal(1);
            });

            // cancel the modal
            click('.fullscreen-modal .btn:contains("Cancel")');

            andThen(function () {
                // it closes the import subscribers modal
                expect(find('.fullscreen-modal').length, 'import subscribers modal displayed after cancel')
                    .to.equal(0);
            });

            // TODO: how to simulate file upload?

            // re-open import modal
            // upload a file
            // modal title changes
            // modal button changes
            // table is reset
            // close modal
        });
    });
});
