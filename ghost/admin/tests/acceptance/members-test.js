import moment from 'moment';
import wait from 'ember-test-helpers/wait';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {timeout} from 'ember-concurrency';
import {visit} from '../helpers/visit';

describe('Acceptance: Members', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects non-admins to site', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/site');
        expect(find('[data-test-nav="members"]'), 'sidebar link')
            .to.not.exist;
    });

    describe('as owner', function () {
        beforeEach(async function () {
            this.server.loadFixtures('configs');

            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            return await authenticateSession();
        });

        it('it renders, can be navigated, can edit member', async function () {
            let member1 = this.server.create('member', {createdAt: moment.utc().subtract(1, 'day').valueOf()});
            this.server.create('member', {createdAt: moment.utc().subtract(2, 'day').valueOf()});

            await visit('/members');

            // second wait is needed for the vertical-collection to settle
            await wait();

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');

            // it has correct page title
            expect(document.title, 'page title').to.equal('Members - Test Blog');

            // it lists all members
            expect(findAll('[data-test-list="members-list-item"]').length, 'members list count')
                .to.equal(2);

            let member = find('[data-test-list="members-list-item"]');
            expect(member.querySelector('.gh-members-list-name').textContent, 'member list item title')
                .to.equal(member1.name);

            await visit(`/members/${member1.id}`);

            // // second wait is needed for the member details to settle
            await wait();

            // it shows selected member form
            expect(find('[data-test-input="member-name"]').value, 'loads correct member into form')
                .to.equal(member1.name);

            expect(find('[data-test-input="member-email"]').value, 'loads correct email into form')
                .to.equal(member1.email);

            // trigger save
            await fillIn('[data-test-input="member-name"]', 'New Name');
            await blur('[data-test-input="member-name"]');

            await click('[data-test-button="save"]');

            // extra timeout needed for Travis - sometimes it doesn't update
            // quick enough and an extra wait() call doesn't help
            await timeout(100);

            await click('[data-test-link="members-back"]');

            await wait();

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');
        });

        it('can create a new member', async function () {
            this.server.create('member', {createdAt: moment.utc().subtract(1, 'day').valueOf()});

            await visit('/members');

            // second wait is needed for the vertical-collection to settle
            await wait();

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');

            // it has correct page title
            expect(document.title, 'page title').to.equal('Members - Test Blog');

            // it lists all members
            expect(findAll('[data-test-list="members-list-item"]').length, 'members list count')
                .to.equal(1);

            //  start new member
            await click('[data-test-new-member-button="true"]');

            // it navigates to the new member route
            expect(currentURL(), 'new member URL').to.equal('/members/new');
            // it displays the new member form
            expect(find('.gh-canvas-header h2').textContent, 'settings pane title')
                .to.contain('New member');

            // all fields start blank
            findAll('.gh-member-settings-primary .gh-input').forEach(function (elem) {
                expect(elem.value, `input field for ${elem.getAttribute('name')}`)
                    .to.be.empty;
            });

            // save new member
            await fillIn('[data-test-input="member-name"]', 'New Name');
            await blur('[data-test-input="member-name"]');

            await fillIn('[data-test-input="member-email"]', 'example@domain.com');
            await blur('[data-test-input="member-email"]');

            await click('[data-test-button="save"]');

            await wait();

            expect(find('[data-test-input="member-name"]').value, 'name has been preserved')
                .to.equal('New Name');

            expect(find('[data-test-input="member-email"]').value, 'email has been preserved')
                .to.equal('example@domain.com');
        });

        it('can bulk delete members', async function () {
            // members to be kept
            this.server.createList('member', 6);

            // imported members to be deleted
            const label = this.server.create('label');
            this.server.createList('member', 5, {labels: [label]});

            await visit('/members');

            expect(findAll('[data-test-member]').length).to.equal(11);

            await click('[data-test-button="members-actions"]');

            expect(find('[data-test-button="delete-selected"]')).to.not.exist;

            // a filter is needed for the delete-selected button to show
            await click('[data-test-button="members-filter-actions"]');
            await click('.gh-member-label-input-labs input');
            await click(`[data-test-label-filter="${label.name}"]`);
            await click(`[data-test-button="members-apply-filter"]`);

            expect(findAll('[data-test-member]').length).to.equal(5);
            expect(currentURL()).to.equal('/members?filter=label%3A%5Blabel-0%5D');

            await click('[data-test-button="members-actions"]');

            expect(find('[data-test-button="delete-selected"]')).to.exist;

            await click('[data-test-button="delete-selected"]');

            expect(find('[data-test-modal="delete-members"]')).to.exist;
            expect(find('[data-test-text="delete-count"]')).to.have.text('5 members');

            await click('[data-test-button="confirm"]');

            expect(find('[data-test-text="deleted-count"]')).to.have.text('5 members');
            expect(find('[data-test-button="confirm"]')).to.not.exist;
            // members filter is reset
            // TODO: fix query params reset for empty strings
            expect(currentURL()).to.equal('/members?search=');
            expect(findAll('[data-test-member]').length).to.equal(6);

            await click('[data-test-button="close-modal"]');

            expect(find('[data-test-modal="delete-members"]')).to.not.exist;
        });
    });
});
