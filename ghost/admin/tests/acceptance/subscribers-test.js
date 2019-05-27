import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentRouteName, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {fileUpload} from '../helpers/file-upload';
import {findAllWithText} from '../helpers/find';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Subscribers', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/subscribers');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects editors to posts', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
        await visit('/subscribers');

        expect(currentURL()).to.equal('/site');
        expect(find('[data-test-nav="subscribers"]'), 'sidebar link')
            .to.not.exist;
    });

    it('redirects authors to posts', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
        await visit('/subscribers');

        expect(currentURL()).to.equal('/site');
        expect(find('[data-test-nav="subscribers"]'), 'sidebar link')
            .to.not.exist;
    });

    it('redirects contributors to posts', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
        await visit('/subscribers');

        expect(currentURL()).to.equal('/site');
        expect(find('[data-test-nav="subscribers"]'), 'sidebar link')
            .to.not.exist;
    });

    describe('an admin', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('can manage subscribers', async function () {
            this.server.createList('subscriber', 40);

            await visit('/');
            await click('[data-test-nav="subscribers"]');

            // it navigates to the correct page
            expect(currentRouteName()).to.equal('subscribers.index');

            // it has correct page title
            expect(document.title, 'page title')
                .to.equal('Subscribers - Test Blog');

            // it loads subscribers
            // NOTE: we use vertical-collection for occlusion so the max number of rows can be less than the
            // number of subscribers that are loaded
            expect(findAll('.subscribers-table tbody tr').length, 'number of subscriber rows')
                .to.be.at.least(30);

            // it shows the total number of subscribers
            expect(find('[data-test-total-subscribers]').textContent.trim(), 'displayed subscribers total')
                .to.equal('(40)');

            // it defaults to sorting by created_at desc
            let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
            expect(lastRequest.queryParams.order).to.equal('created_at desc');

            // click the add subscriber button
            await click('[data-test-link="add-subscriber"]');

            // it displays the add subscriber modal
            expect(find('[data-test-modal="new-subscriber"]'), 'add subscriber modal displayed')
                .to.exist;

            // cancel the modal
            await click('[data-test-button="cancel-new-subscriber"]');

            // it closes the add subscriber modal
            expect(find('[data-test-modal]'), 'add subscriber modal displayed after cancel')
                .to.not.exist;

            // save a new subscriber
            await click('[data-test-link="add-subscriber"]');
            await fillIn('[data-test-input="new-subscriber-email"]', 'test@example.com');
            await click('[data-test-button="create-subscriber"]');

            // the add subscriber modal is closed
            expect(find('[data-test-modal]'), 'add subscriber modal displayed after save')
                .to.not.exist;

            // the subscriber is added to the table
            expect(find('.subscribers-table tbody tr td'), 'first email in list after addition')
                .to.contain.text('test@example.com');

            // the table is scrolled to the top
            // TODO: implement scroll to new record after addition
            // expect(find('.subscribers-table').scrollTop(), 'scroll position after addition')
            //     .to.equal(0);

            // the subscriber total is updated
            expect(find('[data-test-total-subscribers]'), 'subscribers total after addition')
                .to.have.trimmed.text('(41)');

            // saving a duplicate subscriber
            await click('[data-test-link="add-subscriber"]');
            await fillIn('[data-test-input="new-subscriber-email"]', 'test@example.com');
            await click('[data-test-button="create-subscriber"]');

            // the validation error is displayed
            expect(find('[data-test-error="new-subscriber-email"]'), 'duplicate email validation')
                .to.have.trimmed.text('Email address is already subscribed.');

            // the subscriber is not added to the table
            expect(findAllWithText('td.gh-subscribers-table-email-cell', 'test@example.com').length, 'number of "test@example.com rows"')
                .to.equal(1);

            // the subscriber total is unchanged
            expect(find('[data-test-total-subscribers]'), 'subscribers total after failed add')
                .to.have.trimmed.text('(41)');

            // deleting a subscriber
            await click('[data-test-button="cancel-new-subscriber"]');
            await click('.subscribers-table tbody tr:first-of-type button:last-of-type');

            // it displays the delete subscriber modal
            expect(find('[data-test-modal="delete-subscriber"]'), 'delete subscriber modal displayed')
                .to.exist;

            // cancel the modal
            await click('[data-test-button="cancel-delete-subscriber"]');

            // it closes the add subscriber modal
            expect(find('[data-test-modal]'), 'delete subscriber modal displayed after cancel')
                .to.not.exist;

            await click('.subscribers-table tbody tr:first-of-type button:last-of-type');
            await click('[data-test-button="confirm-delete-subscriber"]');

            // the add subscriber modal is closed
            expect(find('[data-test-modal]'), 'delete subscriber modal displayed after confirm')
                .to.not.exist;

            // the subscriber is removed from the table
            expect(find('.subscribers-table tbody td.gh-subscribers-table-email-cell'), 'first email in list after addition')
                .to.not.have.trimmed.text('test@example.com');

            // the subscriber total is updated
            expect(find('[data-test-total-subscribers]'), 'subscribers total after addition')
                .to.have.trimmed.text('(40)');

            // click the import subscribers button
            await click('[data-test-link="import-csv"]');

            // it displays the import subscribers modal
            expect(find('[data-test-modal="import-subscribers"]'), 'import subscribers modal displayed')
                .to.exist;
            expect(find('.fullscreen-modal input[type="file"]'), 'import modal contains file input')
                .to.exist;

            // cancel the modal
            await click('[data-test-button="close-import-subscribers"]');

            // it closes the import subscribers modal
            expect(find('[data-test-modal]'), 'import subscribers modal displayed after cancel')
                .to.not.exist;

            await click('[data-test-link="import-csv"]');
            await fileUpload('.fullscreen-modal input[type="file"]', ['test'], {name: 'test.csv'});

            // modal title changes
            expect(find('[data-test-modal="import-subscribers"] h1'), 'import modal title after import')
                .to.have.trimmed.text('Import Successful');

            // modal button changes
            expect(find('[data-test-button="close-import-subscribers"]'), 'import modal button text after import')
                .to.have.trimmed.text('Close');

            // subscriber total is updated
            expect(find('[data-test-total-subscribers]'), 'subscribers total after import')
                .to.have.trimmed.text('(90)');
        });
    });
});
