import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Members filtering', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');

        let role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    it('has a known base-state', async function () {
        this.server.createList('member', 7);

        await visit('/members');

        // members are listed
        expect(findAll('[data-test-list="members-list-item"]').length, '# of member rows').to.equal(7);

        // export is available
        expect(find('[data-test-button="export-members"]'), 'export members button').to.exist;
        expect(find('[data-test-button="export-members"]'), 'export members button').to.not.have.attribute('disabled');

        // bulk actions are hidden
        expect(find('[data-test-button="add-label-selected"]'), 'add label to selected button').to.not.exist;
        expect(find('[data-test-button="remove-label-selected"]'), 'remove label from selected button').to.not.exist;
        expect(find('[data-test-button="unsubscribe-selected"]'), 'unsubscribe selected button').to.not.exist;
        expect(find('[data-test-button="delete-selected"]'), 'delete selected button').to.not.exist;

        // filter and search are inactive
        expect(find('[data-test-input="members-search"]'), 'search input').to.exist;
        expect(find('[data-test-input="members-search"]'), 'search input').to.not.have.class('active');
        expect(find('[data-test-button="members-filter-actions"]'), 'filter button').to.not.have.class('gh-btn-label-green');
    });

    describe('search', function () {
        beforeEach(function () {
            // specific member names+emails so search is deterministic
            // (default factory has random names+emails)
            this.server.create('member', {name: 'X', email: 'x@x.xxx'});
            this.server.create('member', {name: 'Y', email: 'y@y.yyy'});
            this.server.create('member', {name: 'Z', email: 'z@z.zzz'});
        });

        it('works', async function () {
            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(3);

            await fillIn('[data-test-input="members-search"]', 'X');

            // list updates
            expect(findAll('[data-test-list="members-list-item"]').length, '# of members matching "X"')
                .to.equal(1);

            // URL reflects search
            expect(currentURL()).to.equal('/members?search=X');

            // search input is active
            expect(find('[data-test-input="members-search"]')).to.have.class('active');

            // bulk actions become available
            expect(find('[data-test-button="add-label-selected"]'), 'add label to selected button').to.exist;
            expect(find('[data-test-button="remove-label-selected"]'), 'remove label from selected button').to.exist;
            expect(find('[data-test-button="unsubscribe-selected"]'), 'unsubscribe selected button').to.exist;
            expect(find('[data-test-button="delete-selected"]'), 'delete selected button').to.exist;

            // clearing search returns us to starting state
            await fillIn('[data-test-input="members-search"]', '');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of members after clearing search')
                .to.equal(3);

            expect(find('[data-test-input="members-search"]')).to.not.have.class('active');
        });

        it('populates from query param', async function () {
            await visit('/members?search=Y');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(1);

            expect(find('[data-test-input="members-search"]')).to.have.value('Y');
            expect(find('[data-test-input="members-search"]')).to.have.class('active');
        });

        it('has an empty state', async function () {
            await visit('/members');
            await fillIn('[data-test-input="members-search"]', 'unknown');

            expect(currentURL()).to.equal('/members?search=unknown');

            // replaces members table with the no-matching members state
            expect(find('[data-test-table="members"]')).to.not.exist;
            expect(find('[data-test-no-matching-members]')).to.exist;

            // search input is still shown
            expect(find('[data-test-input="members-search"]')).to.be.visible;
            expect(find('[data-test-input="members-search"]')).to.have.class('active');

            // export is disabled
            expect(find('[data-test-button="export-members"]')).to.have.attribute('disabled');

            // bulk actions are hidden
            expect(find('[data-test-button="add-label-selected"]')).to.not.exist;
            expect(find('[data-test-button="remove-label-selected"]')).to.not.exist;
            expect(find('[data-test-button="unsubscribe-selected"]')).to.not.exist;
            expect(find('[data-test-button="delete-selected"]')).to.not.exist;

            // can clear the search
            await click('[data-test-no-matching-members] [data-test-button="show-all-members"]');

            expect(currentURL()).to.equal('/members');
            expect(find('[data-test-input="members-search"]')).to.have.value('');
            expect(find('[data-test-input="members-search"]')).to.not.have.class('active');
            expect(findAll('[data-test-list="members-list-item"]').length).to.equal(3);
        });
    });
});
