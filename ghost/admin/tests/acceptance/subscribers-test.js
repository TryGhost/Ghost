import destroyApp from '../helpers/destroy-app';
import startApp from '../helpers/start-app';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {expect} from 'chai';

describe('Acceptance: Subscribers', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/subscribers');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects editors to posts', async function () {
        let role = server.create('role', {name: 'Editor'});
        server.create('user', {roles: [role]});

        authenticateSession(application);
        await visit('/subscribers');

        expect(currentURL()).to.equal('/');
        expect(find('.gh-nav-main a:contains("Subscribers")').length, 'sidebar link is visible')
            .to.equal(0);
    });

    it('redirects authors to posts', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role]});

        authenticateSession(application);
        await visit('/subscribers');

        expect(currentURL()).to.equal('/');
        expect(find('.gh-nav-main a:contains("Subscribers")').length, 'sidebar link is visible')
            .to.equal(0);
    });

    describe('an admin', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('can manage subscribers', async function () {
            server.createList('subscriber', 40);

            authenticateSession(application);
            await visit('/');
            await click('.gh-nav-main a:contains("Subscribers")');

            // it navigates to the correct page
            expect(currentPath()).to.equal('subscribers.index');

            // it has correct page title
            expect(document.title, 'page title')
                .to.equal('Subscribers - Test Blog');

            // it loads the first page
            expect(find('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows')
                .to.equal(30);

            // it shows the total number of subscribers
            expect(find('[data-test-total-subscribers]').text().trim(), 'displayed subscribers total')
                .to.equal('(40)');

            // it defaults to sorting by created_at desc
            let [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.order).to.equal('created_at desc');

            let createdAtHeader = find('.subscribers-table th:contains("Subscription Date")');
            expect(createdAtHeader.hasClass('is-sorted'), 'createdAt column is sorted')
                .to.be.true;
            expect(createdAtHeader.find('.gh-icon-descending').length, 'createdAt column has descending icon')
                .to.equal(1);

            // click the column to re-order
            await click('th:contains("Subscription Date")');

            // it flips the directions and re-fetches
            [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.order).to.equal('created_at asc');

            createdAtHeader = find('.subscribers-table th:contains("Subscription Date")');
            expect(createdAtHeader.find('.gh-icon-ascending').length, 'createdAt column has ascending icon')
                .to.equal(1);

            // TODO: scroll test disabled as ember-light-table doesn't calculate
            // the scroll trigger element's positioning against the scroll
            // container - https://github.com/offirgolan/ember-light-table/issues/201
            //
            // // scroll to the bottom of the table to simulate infinite scroll
            // await find('.subscribers-table').scrollTop(find('.subscribers-table .ember-light-table').height() - 50);
            //
            // // trigger infinite scroll
            // await triggerEvent('.subscribers-table tbody', 'scroll');
            //
            // // it loads the next page
            // expect(find('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows after infinite-scroll')
            //     .to.equal(40);

            // click the add subscriber button
            await click('.gh-btn:contains("Add Subscriber")');

            // it displays the add subscriber modal
            expect(find('.fullscreen-modal').length, 'add subscriber modal displayed')
                .to.equal(1);

            // cancel the modal
            await click('.fullscreen-modal .gh-btn:contains("Cancel")');

            // it closes the add subscriber modal
            expect(find('.fullscreen-modal').length, 'add subscriber modal displayed after cancel')
                .to.equal(0);

            // save a new subscriber
            await click('.gh-btn:contains("Add Subscriber")');
            await fillIn('.fullscreen-modal input[name="email"]', 'test@example.com');
            await click('.fullscreen-modal .gh-btn:contains("Add")');

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
            expect(find('[data-test-total-subscribers]').text().trim(), 'subscribers total after addition')
                .to.equal('(41)');

            // saving a duplicate subscriber
            await click('.gh-btn:contains("Add Subscriber")');
            await fillIn('.fullscreen-modal input[name="email"]', 'test@example.com');
            await click('.fullscreen-modal .gh-btn:contains("Add")');

            // the validation error is displayed
            expect(find('.fullscreen-modal .error .response').text().trim(), 'duplicate email validation')
                .to.equal('Email already exists.');

            // the subscriber is not added to the table
            expect(find('.lt-cell:contains(test@example.com)').length, 'number of "test@example.com rows"')
                .to.equal(1);

            // the subscriber total is unchanged
            expect(find('[data-test-total-subscribers]').text().trim(), 'subscribers total after failed add')
                .to.equal('(41)');

            // deleting a subscriber
            await click('.fullscreen-modal .gh-btn:contains("Cancel")');
            await click('.subscribers-table tbody tr:first-of-type button:last-of-type');

            // it displays the delete subscriber modal
            expect(find('.fullscreen-modal').length, 'delete subscriber modal displayed')
                .to.equal(1);

            // cancel the modal
            await click('.fullscreen-modal .gh-btn:contains("Cancel")');

            // it closes the add subscriber modal
            expect(find('.fullscreen-modal').length, 'delete subscriber modal displayed after cancel')
                .to.equal(0);

            await click('.subscribers-table tbody tr:first-of-type button:last-of-type');
            await click('.fullscreen-modal .gh-btn:contains("Delete")');

            // the add subscriber modal is closed
            expect(find('.fullscreen-modal').length, 'delete subscriber modal displayed after confirm')
                .to.equal(0);

            // the subscriber is removed from the table
            expect(find('.subscribers-table .lt-body .lt-row:first-of-type .lt-cell:first-of-type').text().trim(), 'first email in list after addition')
                .to.not.equal('test@example.com');

            // the subscriber total is updated
            expect(find('[data-test-total-subscribers]').text().trim(), 'subscribers total after addition')
                .to.equal('(40)');

            // click the import subscribers button
            await click('.gh-btn:contains("Import CSV")');

            // it displays the import subscribers modal
            expect(find('.fullscreen-modal').length, 'import subscribers modal displayed')
                .to.equal(1);
            expect(find('.fullscreen-modal input[type="file"]').length, 'import modal contains file input')
                .to.equal(1);

            // cancel the modal
            await click('.fullscreen-modal .gh-btn:contains("Cancel")');

            // it closes the import subscribers modal
            expect(find('.fullscreen-modal').length, 'import subscribers modal displayed after cancel')
                .to.equal(0);

            await click('.gh-btn:contains("Import CSV")');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'test.csv'});

            // modal title changes
            expect(find('.fullscreen-modal h1').text().trim(), 'import modal title after import')
                .to.equal('Import Successful');

            // modal button changes
            expect(find('.fullscreen-modal .modal-footer button').text().trim(), 'import modal button text after import')
                .to.equal('Close');

            // subscriber total is updated
            expect(find('[data-test-total-subscribers]').text().trim(), 'subscribers total after import')
                .to.equal('(90)');

            // table is reset
            [lastRequest] = server.pretender.handledRequests.slice(-1);
            expect(lastRequest.url, 'endpoint requested after import')
                .to.match(/\/subscribers\/\?/);
            expect(lastRequest.queryParams.page, 'page requested after import')
                .to.equal('1');

            expect(find('.subscribers-table .lt-body .lt-row').length, 'number of rows in table after import')
                .to.equal(30);

            // close modal
        });
    });
});
