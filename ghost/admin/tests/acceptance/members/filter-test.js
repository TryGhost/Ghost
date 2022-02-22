import moment from 'moment';
import sinon from 'sinon';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {blur, click, currentURL, fillIn, find, findAll, focus} from '@ember/test-helpers';
import {enableLabsFlag} from '../../helpers/labs-flag';
import {expect} from 'chai';
import {selectChoose} from 'ember-power-select/test-support/helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Members filtering', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    let clock;

    beforeEach(async function () {
        this.server.loadFixtures('configs');

        enableLabsFlag(this.server, 'membersLastSeenFilter');

        let role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        return await authenticateSession();
    });

    afterEach(function () {
        clock?.restore();
    });

    it('has a known base-state', async function () {
        this.server.createList('member', 7);

        await visit('/members');

        // members are listed
        expect(find('[data-test-table="members"]')).to.exist;
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
        expect(find('[data-test-button="members-filter-actions"] span'), 'filter button').to.not.have.class('gh-btn-label-green');
    });

    describe('filtering', function () {
        it('can filter by label', async function () {
            // add some labels to test the selection dropdown
            this.server.createList('label', 4);

            // add a labelled member so we can test the filter includes correctly
            const label = this.server.create('label');
            this.server.createList('member', 3, {labels: [label]});

            // add some non-labelled members so we can see the filter excludes correctly
            this.server.createList('member', 4);

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'label');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-not');

            // value dropdown can open and has all labels
            await click(`${filterSelector} .gh-member-label-input .ember-basic-dropdown-trigger`);
            expect(findAll(`${filterSelector} [data-test-label-filter]`).length, '# of label options').to.equal(5);

            // selecting a value updates table
            await selectChoose(`${filterSelector} .gh-member-label-input`, label.name);

            expect(findAll('[data-test-list="members-list-item"]').length, `# of filtered member rows - ${label.name}`)
                .to.equal(3);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by newsletter subscription', async function () {
            // add some members to filter
            this.server.createList('member', 3, {subscribed: true});
            this.server.createList('member', 4, {subscribed: false});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'subscribed');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-not');

            // has the right values
            const valueOptions = findAll(`${filterSelector} [data-test-select="members-filter-value"] option`);
            expect(valueOptions).to.have.length(2);
            expect(valueOptions[0]).to.have.value('true');
            expect(valueOptions[1]).to.have.value('false');

            // applies default filter immediately
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - true')
                .to.equal(3);

            // can change filter
            await fillIn(`${filterSelector} [data-test-select="members-filter-value"]`, 'false');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - false')
                .to.equal(4);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by member status', async function () {
            // add some members to filter
            this.server.createList('member', 3, {status: 'paid'});
            this.server.createList('member', 4, {status: 'free'});
            this.server.createList('member', 2, {status: 'comped'});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(9);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'status');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-not');

            // has the right values
            const valueOptions = findAll(`${filterSelector} [data-test-select="members-filter-value"] option`);
            expect(valueOptions).to.have.length(3);
            expect(valueOptions[0]).to.have.value('paid');
            expect(valueOptions[1]).to.have.value('free');
            expect(valueOptions[2]).to.have.value('comped');

            // applies default filter immediately
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - paid')
                .to.equal(3);

            // can change filter
            await fillIn(`${filterSelector} [data-test-select="members-filter-value"]`, 'comped');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - comped')
                .to.equal(2);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(9);
        });

        it('can filter by billing period', async function () {
            // add some members to filter
            this.server.createList('member', 3, {subscriptions: [{plan_interval: 'month'}]});
            this.server.createList('member', 4, {subscriptions: [{plan_interval: 'year'}]});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'subscriptions.plan_interval');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-not');

            // has the right values
            const valueOptions = findAll(`${filterSelector} [data-test-select="members-filter-value"] option`);
            expect(valueOptions).to.have.length(2);
            expect(valueOptions[0]).to.have.value('month');
            expect(valueOptions[1]).to.have.value('year');

            // applies default filter immediately
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - month')
                .to.equal(3);

            // can change filter
            await fillIn(`${filterSelector} [data-test-select="members-filter-value"]`, 'year');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - year')
                .to.equal(4);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by stripe subscription status', async function () {
            // add some members to filter
            this.server.createList('member', 3, {subscriptions: [{status: 'active'}]});
            this.server.createList('member', 4, {subscriptions: [{status: 'trialing'}]});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'subscriptions.status');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-not');

            // has the right values
            const valueOptions = findAll(`${filterSelector} [data-test-select="members-filter-value"] option`);
            expect(valueOptions).to.have.length(7);
            expect(valueOptions[0]).to.have.value('active');
            expect(valueOptions[1]).to.have.value('trialing');
            expect(valueOptions[2]).to.have.value('canceled');
            expect(valueOptions[3]).to.have.value('unpaid');
            expect(valueOptions[4]).to.have.value('past_due');
            expect(valueOptions[5]).to.have.value('incomplete');
            expect(valueOptions[6]).to.have.value('incomplete_expired');

            // applies default filter immediately
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - active')
                .to.equal(3);

            // can change filter
            await fillIn(`${filterSelector} [data-test-select="members-filter-value"]`, 'trialing');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - trialing')
                .to.equal(4);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by emails sent', async function () {
            // add some members to filter
            this.server.createList('member', 3, {emailCount: 5});
            this.server.createList('member', 4, {emailCount: 10});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'email_count');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(3);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-greater');
            expect(operatorOptions[2]).to.have.value('is-less');

            const valueInput = `${filterSelector} [data-test-input="members-filter-value"]`;

            // has no default filter
            expect(find(valueInput)).to.have.value('');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - true')
                .to.equal(7);

            // can focus/blur value input without issue
            await focus(valueInput);
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - true')
                .to.equal(7);

            // can change filter
            await fillIn(valueInput, '5');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - false')
                .to.equal(3);

            // can clear filter
            await fillIn(valueInput, '');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - false')
                .to.equal(7);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows')
                .to.equal(7);
        });

        it('can filter by emails opened', async function () {
            // add some members to filter
            this.server.createList('member', 3, {emailOpenedCount: 5});
            this.server.createList('member', 4, {emailOpenedCount: 10});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'email_opened_count');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(3);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-greater');
            expect(operatorOptions[2]).to.have.value('is-less');

            const valueInput = `${filterSelector} [data-test-input="members-filter-value"]`;

            // has no default filter
            expect(find(valueInput)).to.have.value('');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - default')
                .to.equal(7);

            // can focus/blur value input without issue
            await focus(valueInput);
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - after blur')
                .to.equal(7);

            // can change filter
            await fillIn(valueInput, '5');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - input 5')
                .to.equal(3);

            // can clear filter
            await fillIn(valueInput, '');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - cleared')
                .to.equal(7);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by open rate', async function () {
            // add some members to filter
            this.server.createList('member', 3, {emailOpenRate: 50});
            this.server.createList('member', 4, {emailOpenRate: 100});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'email_open_rate');

            const operatorSelector = `${filterSelector} [data-test-select="members-filter-operator"]`;

            // has the right operators
            const operatorOptions = findAll(`${operatorSelector} option`);
            expect(operatorOptions).to.have.length(3);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-greater');
            expect(operatorOptions[2]).to.have.value('is-less');

            const valueInput = `${filterSelector} [data-test-input="members-filter-value"]`;

            // has no default filter
            expect(find(valueInput)).to.have.value('');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - default')
                .to.equal(7);

            // can focus/blur value input without issue
            await focus(valueInput);
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - after blur')
                .to.equal(7);

            // can change filter
            await fillIn(valueInput, '50');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - value 50')
                .to.equal(3);

            // can change operator
            await fillIn(operatorSelector, 'is-greater');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - operator is-greater')
                .to.equal(4);

            // can clear filter
            await fillIn(valueInput, '');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - cleared')
                .to.equal(7);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by last seen date', async function () {
            clock = sinon.useFakeTimers({
                now: moment('2022-02-10 11:50:00.000Z').toDate(),
                shouldAdvanceTime: true
            });

            // add some members to filter
            this.server.createList('member', 3, {lastSeenAt: moment('2022-02-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')});
            this.server.createList('member', 4, {lastSeenAt: moment('2022-02-05 12:00:00').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'last_seen_at');

            const operatorSelector = `${filterSelector} [data-test-select="members-filter-operator"]`;

            // has the right operators
            const operatorOptions = findAll(`${operatorSelector} option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is-less');
            expect(operatorOptions[1]).to.have.value('is-greater');

            const valueInput = `${filterSelector} [data-test-input="members-filter-value"]`;

            // has no default filter
            expect(find(valueInput)).to.have.value('');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - default')
                .to.equal(7);

            // can focus/blur value input without issue
            await focus(valueInput);
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - after blur')
                .to.equal(7);

            // can change filter
            await fillIn(valueInput, '2'); // last seen less than 2 days ago
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - last seen less than 2 days ago')
                .to.equal(0);

            await fillIn(valueInput, '6'); // last seen less than 6 days ago
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - last seen less than 6 days ago')
                .to.equal(4);

            await fillIn(valueInput, '11'); // last seen less than 11 days ago
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - last seen less than 11 days ago')
                .to.equal(7);

            // can change operator
            await fillIn(operatorSelector, 'is-greater');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - last seen more than 11 days ago')
                .to.equal(0);

            await fillIn(valueInput, '6'); // last seen more than 6 days ago
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - last seen more than 6 days ago')
                .to.equal(3);

            await fillIn(valueInput, '2'); // last seen more than 2 days ago
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - last seen more than 2 days ago')
                .to.equal(7);
        });

        it('can handle multiple filters', async function () {
            // add some members to filter
            this.server.createList('member', 1, {subscriptions: [{status: 'active'}]});
            this.server.createList('member', 2, {subscriptions: [{status: 'trialing'}]});
            this.server.createList('member', 3, {emailOpenRate: 50, subscriptions: [{status: 'trialing'}]});
            this.server.createList('member', 4, {emailOpenRate: 100});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(10);

            await click('[data-test-button="members-filter-actions"]');

            await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'email_open_rate');
            await fillIn('[data-test-members-filter="0"] [data-test-input="members-filter-value"]', '50');
            await blur('[data-test-members-filter="0"] [data-test-input="members-filter-value"]');

            await click('[data-test-button="add-members-filter"]');

            await fillIn(`[data-test-members-filter="1"] [data-test-select="members-filter"]`, 'subscriptions.status');
            await fillIn(`[data-test-members-filter="1"] [data-test-select="members-filter-value"]`, 'trialing');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of members rows after filter')
                .to.equal(3);

            await click('[data-test-button="members-apply-filter"]');

            // bulk actions are shown
            expect(find('[data-test-button="add-label-selected"]'), 'add label to selected button').to.exist;
            expect(find('[data-test-button="remove-label-selected"]'), 'remove label from selected button').to.exist;
            expect(find('[data-test-button="unsubscribe-selected"]'), 'unsubscribe selected button').to.exist;
            expect(find('[data-test-button="delete-selected"]'), 'delete selected button').to.exist;

            // filter is active and has # of filters
            expect(find('[data-test-button="members-filter-actions"] span'), 'filter button').to.have.class('gh-btn-label-green');
            expect(find('[data-test-button="members-filter-actions"]'), 'filter button').to.contain.text('(2)');

            // search is inactive
            expect(find('[data-test-input="members-search"]'), 'search input').to.exist;
            expect(find('[data-test-input="members-search"]'), 'search input').to.not.have.class('active');

            // can reset filter
            await click('[data-test-button="members-filter-actions"]');
            await click('[data-test-button="reset-members-filter"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(10);

            // filter is inactive
            expect(find('[data-test-button="members-filter-actions"] span'), 'filter button').to.not.have.class('gh-btn-label-green');
        });

        it('has a no-match state', async function () {
            this.server.createList('member', 5, {subscriptions: [{status: 'active'}]});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(5);

            await click('[data-test-button="members-filter-actions"]');

            await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'email_open_rate');
            await fillIn('[data-test-members-filter="0"] [data-test-input="members-filter-value"]', '50');
            await blur('[data-test-members-filter="0"] [data-test-input="members-filter-value"]');

            await click('[data-test-button="members-apply-filter"]');

            // replaces members table with the no-matching members state
            expect(find('[data-test-table="members"]')).to.not.exist;
            expect(find('[data-test-no-matching-members]')).to.exist;

            // search input is hidden
            expect(find('[data-test-input="members-search"]')).to.not.be.visible;

            // export is disabled
            expect(find('[data-test-button="export-members"]')).to.have.attribute('disabled');

            // bulk actions are hidden
            expect(find('[data-test-button="add-label-selected"]')).to.not.exist;
            expect(find('[data-test-button="remove-label-selected"]')).to.not.exist;
            expect(find('[data-test-button="unsubscribe-selected"]')).to.not.exist;
            expect(find('[data-test-button="delete-selected"]')).to.not.exist;

            // can clear the filter
            await click('[data-test-no-matching-members] [data-test-button="show-all-members"]');

            expect(currentURL()).to.equal('/members');
            expect(find('[data-test-button="members-filter-actions"] span'), 'filter button').to.not.have.class('gh-btn-label-green');
        });

        it('resets filter operator when changing filter type', async function () {
            // BUG: changing the filter type was not resetting the filter operator
            // meaning you could have an "is-greater" operator applied to an
            // "is/is-not" filter type

            this.server.createList('member', 3, {subscriptions: [{status: 'active'}]});
            this.server.createList('member', 4, {emailCount: 10});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filter = '[data-test-members-filter="0"]';

            await fillIn(`${filter} [data-test-select="members-filter"]`, 'email_count');
            await fillIn(`${filter} [data-test-select="members-filter-operator"]`, 'is-greater');
            await fillIn(`${filter} [data-test-input="members-filter-value"]`, '9');
            await blur(`${filter} [data-test-input="members-filter-value"]`);

            expect(findAll('[data-test-list="members-list-item"]').length, '# of members after email_count filter')
                .to.equal(4);

            await fillIn(`${filter} [data-test-select="members-filter"]`, 'subscriptions.status');

            expect(find(`${filter} [data-test-select="members-filter-operator"]`)).to.have.value('is');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of members after email_count filter')
                .to.equal(3);
        });
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

        it('has a no-match state', async function () {
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

        it('can search + filter', async function () {
            this.server.create('member', {name: 'A', email: 'a@aaa.aaa', subscriptions: [{status: 'active'}]});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(4);

            await click('[data-test-button="members-filter-actions"]');
            await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'subscriptions.status');
            await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter-value"]', 'active');
            await click('[data-test-button="members-apply-filter"]');

            await fillIn('[data-test-input="members-search"]', 'a');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of member rows after filter+search')
                .to.equal(1);

            // filter is active and has # of filters
            expect(find('[data-test-button="members-filter-actions"] span'), 'filter button').to.have.class('gh-btn-label-green');
            expect(find('[data-test-button="members-filter-actions"]'), 'filter button').to.contain.text('(1)');

            // search input is active
            expect(find('[data-test-input="members-search"]')).to.have.class('active');
        });
    });
});
