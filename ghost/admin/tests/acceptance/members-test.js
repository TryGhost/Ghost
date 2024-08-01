import moment from 'moment-timezone';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
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
            let member1 = this.server.create('member', {createdAt: moment.utc().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')});
            this.server.create('member', {createdAt: moment.utc().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');

            // it lists all members
            expect(findAll('[data-test-list="members-list-item"]').length, 'members list count')
                .to.equal(2);

            // it highlights active state in nav menu
            expect(
                find('[data-test-nav="members"]'),
                'highlights nav menu item'
            ).to.have.class('active');

            let member = find('[data-test-list="members-list-item"]');
            expect(member.querySelector('.gh-members-list-name').textContent, 'member list item title')
                .to.equal(member1.name);

            // it does not add ?include=email_recipients
            const membersRequests = this.server.pretender.handledRequests.filter(r => r.url.match(/\/members\/(\?|$)/));
            expect(membersRequests[0].url).to.not.have.string('email_recipients');

            await visit(`/members/${member1.id}`);

            // it shows selected member form
            expect(find('[data-test-input="member-name"]').value, 'loads correct member into form')
                .to.equal(member1.name);

            expect(find('[data-test-input="member-email"]').value, 'loads correct email into form')
                .to.equal(member1.email);

            // it maintains active state in nav menu
            expect(
                find('[data-test-nav="members"]'),
                'highlights nav menu item'
            ).to.have.class('active');

            // trigger save
            await fillIn('[data-test-input="member-name"]', 'New Name');
            await blur('[data-test-input="member-name"]');

            await click('[data-test-button="save"]');

            await click('[data-test-link="members-back"]');

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');
        });

        it('can create a new member', async function () {
            this.server.create('member', {createdAt: moment.utc().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');

            // it lists all members
            expect(findAll('[data-test-list="members-list-item"]').length, 'members list count')
                .to.equal(1);

            //  start new member
            await click('[data-test-new-member-button="true"]');

            // it navigates to the new member route
            expect(currentURL(), 'new member URL').to.equal('/members/new');
            // it displays the new member form
            expect(find('.gh-canvas-header h2').textContent, 'settings pane title')
                .to.contain('New');

            // it highlights active state in nav menu
            expect(
                find('[data-test-nav="members"]'),
                'highlights nav menu item'
            ).to.have.class('active');

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

            expect(find('[data-test-input="member-name"]').value, 'name has been preserved')
                .to.equal('New Name');

            expect(find('[data-test-input="member-email"]').value, 'email has been preserved')
                .to.equal('example@domain.com');
        });

        /* NOTE: Bulk deletion is disabled temporarily when multiple filters are applied, due to a NQL limitation.
         * Delete this test once we have fixed the root NQL limitation.
         * See https://linear.app/tryghost/issue/ONC-203
        */
        it('cannot bulk delete members if more than 1 filter is selected', async function () {
            // Members with label
            const labelOne = this.server.create('label');
            const labelTwo = this.server.create('label');
            this.server.createList('member', 2, {labels: [labelOne]});
            this.server.createList('member', 2, {labels: [labelOne, labelTwo]});

            await visit('/members');
            expect(findAll('[data-test-member]').length).to.equal(4);

            // The delete button should not be visible by default
            await click('[data-test-button="members-actions"]');
            expect(find('[data-test-button="delete-selected"]')).to.not.exist;

            // Apply a single filter
            await click('[data-test-button="members-filter-actions"]');
            await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'label');
            await click('.gh-member-label-input input');
            await click(`[data-test-label-filter="${labelOne.name}"]`);
            await click(`[data-test-button="members-apply-filter"]`);

            expect(findAll('[data-test-member]').length).to.equal(4);
            expect(currentURL()).to.equal(`/members?filter=label%3A%5B${labelOne.slug}%5D`);

            await click('[data-test-button="members-actions"]');
            expect(find('[data-test-button="delete-selected"]')).to.exist;

            // Apply a second filter
            await click('[data-test-button="members-filter-actions"]');
            await click('[data-test-button="add-members-filter"]');

            await fillIn('[data-test-members-filter="1"] [data-test-select="members-filter"]', 'label');
            await click('[data-test-members-filter="1"] .gh-member-label-input input');
            await click(`[data-test-members-filter="1"] [data-test-label-filter="${labelTwo.name}"]`);
            await click(`[data-test-button="members-apply-filter"]`);

            expect(findAll('[data-test-member]').length).to.equal(2);
            expect(currentURL()).to.equal(`/members?filter=label%3A%5B${labelOne.slug}%5D%2Blabel%3A%5B${labelTwo.slug}%5D`);

            await click('[data-test-button="members-actions"]');
            expect(find('[data-test-button="delete-selected"]')).to.not.exist;
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
            await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'label');
            await click('.gh-member-label-input input');
            await click(`[data-test-label-filter="${label.name}"]`);
            await click(`[data-test-button="members-apply-filter"]`);

            expect(findAll('[data-test-member]').length).to.equal(5);
            expect(currentURL()).to.equal(`/members?filter=label%3A%5B${label.slug}%5D`);

            await click('[data-test-button="members-actions"]');

            expect(find('[data-test-button="delete-selected"]')).to.exist;

            await click('[data-test-button="delete-selected"]');

            expect(find('[data-test-modal="delete-members"]')).to.exist;
            expect(find('[data-test-text="delete-count"]')).to.have.text('5 members');

            // ensure export endpoint gets hit with correct query params when deleting
            let exportQueryParams;
            this.server.get('/members/upload', (schema, request) => {
                exportQueryParams = request.queryParams;
            });

            await click('[data-test-button="confirm"]');

            expect(exportQueryParams).to.deep.equal({filter: 'label:[label-0]', limit: 'all'});

            expect(find('[data-test-text="deleted-count"]')).to.have.text('5 members');
            expect(find('[data-test-button="confirm"]')).to.not.exist;

            // members filter is reset
            expect(currentURL()).to.equal('/members');
            expect(findAll('[data-test-member]').length).to.equal(6);

            await click('[data-test-button="close-modal"]');

            expect(find('[data-test-modal="delete-members"]')).to.not.exist;
        });

        it('can delete a member (via list)', async function () {
            const newsletter = this.server.create('newsletter');
            const label = this.server.create('label');
            this.server.createList('member', 2, {newsletters: [newsletter], labels: [label]});

            await visit('/members');

            expect(findAll('[data-test-member]').length).to.equal(2);

            await click('[data-test-member] a');

            expect(currentURL()).to.match(/members\/\d+/);

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');

            expect(find('[data-test-modal="delete-member"]')).to.exist;

            await click('[data-test-modal="delete-member"] [data-test-button="cancel"]');

            expect(currentURL()).to.match(/members\/\d+/);
            expect(find('[data-test-modal="delete-member"]')).to.not.exist;

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');
            await click('[data-test-modal="delete-member"] [data-test-button="confirm"]');

            expect(currentURL()).to.equal('/members');
            expect(findAll('[data-test-modal]')).to.have.length(0);
            expect(findAll('[data-test-member]')).to.have.length(1);
        });

        it('can delete a member (via url)', async function () {
            const newsletter = this.server.create('newsletter');
            const label = this.server.create('label');
            const [memberOne] = this.server.createList('member', 2, {newsletters: [newsletter], labels: [label]});

            await visit(`/members/${memberOne.id}`);

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');

            expect(find('[data-test-modal="delete-member"]')).to.exist;

            await click('[data-test-modal="delete-member"] [data-test-button="cancel"]');

            expect(currentURL()).to.match(/members\/\d+/);
            expect(find('[data-test-modal="delete-member"]')).to.not.exist;

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');
            await click('[data-test-modal="delete-member"] [data-test-button="confirm"]');

            expect(currentURL()).to.equal('/members');
            expect(findAll('[data-test-modal]')).to.have.length(0);
            expect(findAll('[data-test-member]')).to.have.length(1);
        });
    });
});
