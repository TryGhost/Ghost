import moment from 'moment-timezone';
import sinon from 'sinon';
import {authenticateSession} from 'ember-simple-auth/test-support';
import {blur, click, currentURL, fillIn, find, findAll, focus} from '@ember/test-helpers';
import {datepickerSelect} from 'ember-power-datepicker/test-support';
import {enableNewsletters} from '../../helpers/newsletters';
import {enablePaidMembers} from '../../helpers/members';
import {enableStripe} from '../../helpers/stripe';
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
        this.server.loadFixtures('settings');
        this.server.loadFixtures('newsletters');
        enableStripe(this.server);
        enableNewsletters(this.server, true);
        enablePaidMembers(this.server);

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

        // standard columns are shown
        expect(findAll('[data-test-table="members"] [data-test-table-column]').length).to.equal(4);
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
            await click(`${filterSelector} .gh-member-label-input`);
            expect(findAll(`${filterSelector} [data-test-label-filter]`).length, '# of label options').to.equal(5);

            // selecting a value updates table
            await selectChoose(`${filterSelector} .gh-member-label-input`, label.name);

            expect(findAll('[data-test-list="members-list-item"]').length, `# of filtered member rows - ${label.name}`)
                .to.equal(3);

            // table shows labels column+data
            expect(find('[data-test-table-column="label"]')).to.exist;
            expect(findAll('[data-test-table-data="label"]').length).to.equal(3);
            expect(find('[data-test-table-data="label"]')).to.contain.text(label.name);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by tier', async function () {
            // add multiple tiers to activate tiers filtering
            const newsletter = this.server.create('newsletter', {status: 'active'});
            this.server.createList('tier', 4);

            // add some members with tiers
            const tier = this.server.create('tier', {id: 'qwerty123456789'});
            this.server.createList('member', 3, {tiers: [tier], newsletters: [newsletter]});

            // add some free members so we can see the filter excludes correctly
            this.server.createList('member', 4, {newsletters: [newsletter]});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);
            await click('[data-test-button="members-filter-actions"]');
            const filterSelector = `[data-test-members-filter="0"]`;

            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'tier_id');
            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-not');

            // value dropdown can open and has all labels
            await click(`${filterSelector} .gh-tier-token-input`);
            expect(findAll(`${filterSelector} [data-test-tiers-segment]`).length, '# of label options').to.equal(5);

            // selecting a value updates table
            await selectChoose(`${filterSelector} .gh-tier-token-input`, tier.name);

            expect(findAll('[data-test-list="members-list-item"]').length, `# of filtered member rows - ${tier.name}`)
                .to.equal(3);
            // table shows labels column+data
            expect(find('[data-test-table-column="status"]')).to.exist;
            expect(findAll('[data-test-table-data="status"]').length).to.equal(3);
            expect(find('[data-test-table-data="status"]')).to.contain.text(tier.name);

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });
        
        it('can filter by offer redeemed', async function () {
            // add some offers to test the selection dropdown
            const tier = this.server.create('tier');
            
            // create 3 offers
            const offer = this.server.create('offer', {tier: {id: tier.id}, createdAt: moment.utc().subtract(1, 'day').valueOf()});
            this.server.create('offer', {tier: {id: tier.id}, createdAt: moment.utc().subtract(2, 'day').valueOf()});
            this.server.create('offer', {tier: {id: tier.id}, createdAt: moment.utc().subtract(3, 'day').valueOf()});
            this.server.createList('member', 3, {status: 'paid', tiers: [tier]});
            const sub = this.server.create('subscription', {member: this.server.schema.members.first(), tier: tier, offer: offer});
            const member = this.server.schema.members.first();
            member.update({subscriptions: [sub]});

            await visit('/members');
            await click('[data-test-button="members-filter-actions"]');
            const filterSelector = `[data-test-members-filter="0"]`;
            await fillIn(`${filterSelector} [data-test-select="members-filter"]`, 'offer_redemptions');

            // has the right operators
            const operatorOptions = findAll(`${filterSelector} [data-test-select="members-filter-operator"] option`);
            expect(operatorOptions).to.have.length(2);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('is-not');

            await click(`${filterSelector} [data-test-token-input]`);
            // this ensures that the offers are loaded into the multi-select dropdown in the filter
            expect(findAll(`${filterSelector} [data-test-offers-segment]`).length, '# of label options').to.equal(3);

            // can set filter by path
            await visit('/');
            await visit('/members?filter=' + encodeURIComponent(`offer_redemptions:'${offer.id}'`)); // ensure that the id is parsed as a string and not an integer

            // only one redeemed offer so only 1 member should be shown
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows').to.equal(1);
        });
            
        it('can filter by specific newsletter subscription', async function () {
            // add some members to filters
            const newsletter = this.server.create('newsletter', {status: 'active', slug: 'test-newsletter'});
            this.server.createList('newsletter', 4);
            this.server.createList('tier', 4);
            this.server.createList('member', 4, {subscribed: false});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(4);

            await click('[data-test-button="members-filter-actions"]');
            // make sure newsletters are in the filter dropdown
            const newslettersCount = this.server.schema.newsletters.all().models.length;
            let options = this.element.querySelectorAll('option');
            let matchingOptions = [...options].filter(option => option.value.includes('newsletters.slug'));
            expect(matchingOptions).to.have.length(newslettersCount);

            await visit('/');
            await visit('/members');
            // add some members with tiers
            const tier = this.server.create('tier');
            const member = this.server.create('member', {tiers: [tier], subscribed: true});
            member.update({newsletters: [newsletter]});
            this.server.createList('member', 4, {subscribed: false});

            await visit('/members?filter=' + encodeURIComponent(`newsletters.slug:${newsletter.slug}`));
            // only 1 member is subscribed so we should only see 1 row
            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(1);
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
            expect(find('[data-test-table-column="subscribed"]')).to.exist;

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);

            // Can set filter by path
            await visit('/');
            await visit('/members?filter=' + encodeURIComponent('subscribed:true'));
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - true - from URL')
                .to.equal(3);
            await click('[data-test-button="members-filter-actions"]');
            expect(find(`${filterSelector} [data-test-select="members-filter-value"]`)).to.have.value('true');

            // Can set filter by path
            await visit('/');
            await visit('/members?filter=' + encodeURIComponent('subscribed:false'));
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - false - from URL')
                .to.equal(4);
            await click('[data-test-button="members-filter-actions"]');
            expect(find(`${filterSelector} [data-test-select="members-filter-value"]`)).to.have.value('false');
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

            expect(
                find(`${filterSelector} [data-test-select="members-filter"] option[value="status"]`),
                'status filter option'
            ).to.exist;
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
            expect(find('[data-test-table-column="status"]')).to.exist;

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(9);
        });

        it('can filter by billing period', async function () {
            // add some members to filter
            this.server.createList('member', 3).forEach(member => this.server.create('subscription', {member, planInterval: 'month'}));
            this.server.createList('member', 4).forEach(member => this.server.create('subscription', {member, planInterval: 'year'}));

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
            expect(find('[data-test-table-column="subscriptions.plan_interval"]')).to.exist;

            // can delete filter
            await click('[data-test-delete-members-filter="0"]');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete')
                .to.equal(7);
        });

        it('can filter by stripe subscription status', async function () {
            // add some members to filter
            this.server.createList('member', 3).forEach(member => this.server.create('subscription', {member, status: 'active'}));
            this.server.createList('member', 4).forEach(member => this.server.create('subscription', {member, status: 'trialing'}));

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
            expect(find('[data-test-table-column="subscriptions.status"]')).to.exist;

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
            expect(find('[data-test-table-column="email_count"]')).to.exist;

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
            expect(find('[data-test-table-column="email_opened_count"]')).to.exist;

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
            expect(find('[data-test-table-column="email_open_rate"]')).to.exist;

            // can change operator
            await fillIn(operatorSelector, 'is-greater');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - operator is-greater')
                .to.equal(4);

            // it does not add duplicate column
            expect(find('[data-test-table-column="email_open_rate"]')).to.exist;
            expect(findAll('[data-test-table-column="email_open_rate"]').length).to.equal(1);

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
                now: moment('2022-02-05 11:50:00.000Z').toDate(),
                shouldAdvanceTime: true
            });

            // add some members to filter
            this.server.createList('member', 3, {lastSeenAt: moment('2022-02-01 11:00:00').format('YYYY-MM-DD HH:mm:ss')});
            this.server.createList('member', 4, {lastSeenAt: moment('2022-02-05 11:00:00').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            const filterSelect = `[data-test-members-filter="0"]`;
            const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
            const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
            const valueInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
            const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`;

            await click('[data-test-button="members-filter-actions"]');
            await fillIn(typeSelect, 'last_seen_at');

            // has the right operators
            const operatorOptions = findAll(`${operatorSelect} option`);
            expect(operatorOptions).to.have.length(4);
            expect(operatorOptions[0]).to.have.value('is-less');
            expect(operatorOptions[1]).to.have.value('is-or-less');
            expect(operatorOptions[2]).to.have.value('is-greater');
            expect(operatorOptions[3]).to.have.value('is-or-greater');

            // has the right default operator
            expect(find(operatorSelect)).to.have.value('is-or-less');

            // has expected default value
            expect(find(valueInput)).to.have.value('2022-02-05');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - default')
                .to.equal(7);

            // can focus/blur value input without issue
            await focus(valueInput);
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - after blur')
                .to.equal(7);

            // can change operator
            await fillIn(operatorSelect, 'is-less');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is before 2022-02-05')
                .to.equal(3);

            // can change filter via input
            await fillIn(operatorSelect, 'is-greater');
            await fillIn(valueInput, '2022-02-01');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is after 2022-02-01')
                .to.equal(4);

            // can change filter via date picker
            await fillIn(operatorSelect, 'is-or-greater');
            await datepickerSelect(valueDatePicker, moment.utc('2022-01-01').toDate());
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is after 2022-01-01')
                .to.equal(7);

            // table shows last seen column+data
            expect(find('[data-test-table-column="last_seen_at"]')).to.exist;
            expect(findAll('[data-test-table-data="last_seen_at"]').length).to.equal(7);
            expect(find('[data-test-table-data="last_seen_at"]')).to.contain.trimmed.text('1 Feb 2022');
            expect(find('[data-test-table-data="last_seen_at"]')).to.contain.trimmed.text('4 days ago');
        });

        it('can filter by created at date', async function () {
            clock = sinon.useFakeTimers({
                now: moment('2022-03-01 09:00:00.000Z').toDate(),
                shouldAdvanceTime: true
            });

            // add some members to filter
            this.server.createList('member', 3, {createdAt: moment('2022-02-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')});
            this.server.createList('member', 4, {createdAt: moment('2022-02-05 12:00:00').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelect = `[data-test-members-filter="0"]`;
            const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
            const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;

            expect(find(`${filterSelect} [data-test-select="members-filter"] option[value="created_at"]`), 'created_at filter option').to.exist;

            await fillIn(typeSelect, 'created_at');

            // has the right operators
            const operatorOptions = findAll(`${operatorSelect} option`);
            expect(operatorOptions).to.have.length(4);
            expect(operatorOptions[0]).to.have.value('is-less');
            expect(operatorOptions[1]).to.have.value('is-or-less');
            // expect(operatorOptions[2]).to.have.value('is');
            // expect(operatorOptions[3]).to.have.value('is-not');
            expect(operatorOptions[2]).to.have.value('is-greater');
            expect(operatorOptions[3]).to.have.value('is-or-greater');

            const valueDateInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
            const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`;

            // operator defaults to "on or before"
            expect(find(operatorSelect)).to.have.value('is-or-less');

            // value defaults to today's date
            expect(find(valueDateInput)).to.have.value('2022-03-01');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - default')
                .to.equal(7);

            // can change date
            await datepickerSelect(valueDatePicker, moment.utc('2022-02-03').toDate());
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - 2022-02-03')
                .to.equal(3);

            // can change operator
            await fillIn(operatorSelect, 'is-greater');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-greater')
                .to.equal(4);

            // can populate filter from URL
            // TODO: leaving screen is needed, suggests component is not fully reactive and needs to be torn down.
            // - see <Members::Filter> constructor
            await visit(`/`);
            const filter = encodeURIComponent(`created_at:<='2022-02-01 23:59:59'`);
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');

            expect(find(typeSelect), 'type select - from URL').to.have.value('created_at');
            expect(find(operatorSelect), 'operator select - from URL').to.have.value('is-or-less');
            expect(find(valueDateInput), 'date input - from URL').to.have.value('2022-02-01');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL')
                .to.equal(3);

            // "on or after" doesn't break
            await fillIn(operatorSelect, 'is-or-greater');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-or-greater after URL change')
                .to.equal(7);

            // it does not add extra column to table
            expect(find('[data-test-table-column="created_at"]')).to.not.exist;
        });

        it('uses site timezone when filtering by date', async function () {
            // with a site timezone UTC-5 (Eastern Time Zone) we would expect date-based NQL filter strings
            // to be adjusted to UTC.
            //
            // Eg. "created on or after 2022-02-22" = `created_at:>='2022-02-22 05:00:00'
            //
            // we also need to convert back when parsing the NQL-based query param and make sure dates
            // shown in the members table match site timezone

            // UTC-5 timezone
            this.server.db.settings.update({key: 'timezone'}, {value: 'America/New_York'});

            // 2022-02-21 signups
            this.server.createList('member', 3, {createdAt: moment.utc('2022-02-22 04:00:00.000Z').format('YYYY-MM-DD HH:mm:ss')});
            // 2022-02-22 signups
            this.server.createList('member', 4, {createdAt: moment.utc('2022-02-22 05:00:00.000Z').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            // created dates in table should match the date in site timezone not UTC (in UTC they would all be 21st)
            const createdAtFields = findAll('[data-test-list="members-list-item"] [data-test-table-data="created-at"]');
            expect(createdAtFields.filter(el => el.textContent.match(/21 Feb 2022/)).length).to.equal(3);
            expect(createdAtFields.filter(el => el.textContent.match(/22 Feb 2022/)).length).to.equal(4);

            const filterSelect = `[data-test-members-filter="0"]`;
            const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
            const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
            const valueInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;

            // filter date is transformed to UTC equivalent timeframe when querying
            await click('[data-test-button="members-filter-actions"]');
            await fillIn(typeSelect, 'created_at');
            await fillIn(operatorSelect, 'is-or-greater');
            await fillIn(valueInput, '2022-02-22');
            await blur(valueInput);

            expect(findAll('[data-test-list="members-list-item"]').length, '# of member rows - post filter')
                .to.equal(4);

            // query param is transformed back to expected filter date value
            await visit('/'); // TODO: remove once <Members::Filter> component reacts to filter updates
            const filterQuery = encodeURIComponent(`created_at:<='2022-02-22 04:59:59'`);
            await visit(`/members?filter=${filterQuery}`);

            expect(findAll('[data-test-list="members-list-item"]').length, '# of member rows - post URL parse')
                .to.equal(3);

            await click('[data-test-button="members-filter-actions"]');

            expect(find(operatorSelect)).to.have.value('is-or-less');
            expect(find(valueInput)).to.have.value('2022-02-21');

            // it initializes date filter with correct site timezone date
            // "local" is 1st March 04:00 but site time is 28th Feb 00:00
            clock = sinon.useFakeTimers({
                now: moment('2022-03-01 04:00:00.000Z').toDate(),
                shouldAdvanceTime: true
            });

            await click('[data-test-delete-members-filter="0"]');
            await click('[data-test-button="members-filter-actions"]');
            await fillIn(typeSelect, 'created_at');

            expect(find(valueInput)).to.have.value('2022-02-28');
        });

        it('can filter by paid subscription start date', async function () {
            clock = sinon.useFakeTimers({
                now: moment('2022-03-01 09:00:00.000Z').toDate(),
                shouldAdvanceTime: true
            });

            // add some members to filter
            this.server.createList('member', 3).forEach(member => this.server.create('subscription', {member, startDate: moment('2022-02-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')}));
            this.server.createList('member', 4).forEach(member => this.server.create('subscription', {member, startDate: moment('2022-02-05 12:00:00').format('YYYY-MM-DD HH:mm:ss')}));
            this.server.createList('member', 2);

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(9);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelect = `[data-test-members-filter="0"]`;
            const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
            const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;

            expect(find(`${filterSelect} [data-test-select="members-filter"] option[value="subscriptions.start_date"]`), 'subscriptions.start_date filter option').to.exist;

            await fillIn(typeSelect, 'subscriptions.start_date');

            // has the right operators
            const operatorOptions = findAll(`${operatorSelect} option`);
            expect(operatorOptions).to.have.length(4);
            expect(operatorOptions[0]).to.have.value('is-less');
            expect(operatorOptions[1]).to.have.value('is-or-less');
            // expect(operatorOptions[2]).to.have.value('is');
            // expect(operatorOptions[3]).to.have.value('is-not');
            expect(operatorOptions[2]).to.have.value('is-greater');
            expect(operatorOptions[3]).to.have.value('is-or-greater');

            const valueDateInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
            const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`;

            // operator defaults to "on or before"
            expect(find(operatorSelect)).to.have.value('is-or-less');

            // value defaults to today's date
            expect(find(valueDateInput)).to.have.value('2022-03-01');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - default')
                .to.equal(7);

            // can change date
            await datepickerSelect(valueDatePicker, moment.utc('2022-02-03').toDate());
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - 2022-02-03')
                .to.equal(3);

            // can change operator
            await fillIn(operatorSelect, 'is-greater');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-greater')
                .to.equal(4);

            // can populate filter from URL
            // TODO: leaving screen is needed, suggests component is not fully reactive and needs to be torn down.
            // - see <Members::Filter> constructor
            await visit(`/`);
            const filter = encodeURIComponent(`subscriptions.start_date:<='2022-02-01 23:59:59'`);
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');

            expect(find(typeSelect), 'type select - from URL').to.have.value('subscriptions.start_date');
            expect(find(operatorSelect), 'operator select - from URL').to.have.value('is-or-less');
            expect(find(valueDateInput), 'date input - from URL').to.have.value('2022-02-01');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL')
                .to.equal(3);

            // it adds extra column to table
            expect(find('[data-test-table-column="subscriptions.start_date"]')).to.exist;
            expect(find('[data-test-table-column="subscriptions.start_date"]')).to.contain.text('Paid start date');
            expect(findAll('[data-test-table-data="subscriptions.start_date"]').length).to.equal(3);
            expect(find('[data-test-table-data="subscriptions.start_date"]')).to.contain.text('1 Feb 2022');
            expect(find('[data-test-table-data="subscriptions.start_date"]')).to.contain.text('a month ago');
        });

        it('can filter by name', async function () {
            this.server.create('member', {name: 'test-1'});
            this.server.create('member', {name: 'test-2'});
            this.server.create('member', {name: 'tset-1'});
            this.server.create('member', {name: 'tset-2'});
            this.server.create('member', {name: 'tset-3'});
            this.server.create('member', {name: 'hello'});
            this.server.create('member', {name: 'John O\'Nolan'});
            this.server.create('member', {name: null});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(8);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelect = `[data-test-members-filter="0"]`;
            const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
            const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
            const valueInput = `${filterSelect} [data-test-input="members-filter-value"]`;

            expect(find(`${filterSelect} [data-test-select="members-filter"] option[value="name"]`), 'name filter option').to.exist;

            await fillIn(typeSelect, 'name');

            // has the right operators
            const operatorOptions = findAll(`${operatorSelect} option`);
            expect(operatorOptions).to.have.length(5);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('contains');
            expect(operatorOptions[2]).to.have.value('does-not-contain');
            expect(operatorOptions[3]).to.have.value('starts-with');
            expect(operatorOptions[4]).to.have.value('ends-with');

            // has expected default operator and value
            expect(find(operatorSelect)).to.have.value('is');
            expect(find(valueInput)).to.have.value('');

            // can change filter
            await fillIn(valueInput, 'hello');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is "hello"')
                .to.equal(1);

            // can change operator
            await fillIn(operatorSelect, 'contains');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "hello"')
                .to.equal(1);

            // contains query works
            await fillIn(valueInput, 'test');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "test"')
                .to.equal(2);

            // starts with query works
            await fillIn(operatorSelect, 'starts-with');
            await fillIn(valueInput, 'tset');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - starts with "tset"')
                .to.equal(3);

            // ends with query works
            await fillIn(operatorSelect, 'ends-with');
            await fillIn(valueInput, '2');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - ends with "2"')
                .to.equal(2);

            // does not contain query works
            await fillIn(operatorSelect, 'does-not-contain');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - does not contain "2"')
                .to.equal(6);

            // can query with escaped chars
            await fillIn(operatorSelect, 'contains');
            await fillIn(valueInput, `O'Nolan`);
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "O\'Nolan"')
                .to.equal(1);

            // no duplicate column added (name is included in the "details" column)
            expect(find('[data-test-table-column="name"]')).to.not.exist;

            // can handle contains operator in URL
            let filter = encodeURIComponent(`name:~'hello'`);
            await visit('/');
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "hello"')
                .to.equal(1);
            expect(find(operatorSelect)).to.have.value('contains');
            expect(find(valueInput)).to.have.value('hello');

            // can handle starts-with operator in URL
            filter = encodeURIComponent(`name:~^'tset'`);
            await visit('/');
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL starts with "tset"')
                .to.equal(3);
            expect(find(operatorSelect)).to.have.value('starts-with');
            expect(find(valueInput)).to.have.value('tset');

            // can handle ends-with operator in URL
            filter = encodeURIComponent(`name:~$'2'`);
            await visit('/');
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL ends with "2"')
                .to.equal(2);
            expect(find(operatorSelect)).to.have.value('ends-with');
            expect(find(valueInput)).to.have.value('2');

            // can handle does-not-contain operator in URL
            filter = encodeURIComponent(`name:-~'2'`);
            await visit('/');
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL does not contain "2"')
                .to.equal(6);
            expect(find(operatorSelect)).to.have.value('does-not-contain');
            expect(find(valueInput)).to.have.value('2');

            // can handle escaped values in URL
            filter = encodeURIComponent(`name:~'O\\'Nolan'`);
            await visit('/');
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "O\'Nolan"')
                .to.equal(1);
            expect(find(operatorSelect)).to.have.value('contains');
            expect(find(valueInput)).to.have.value(`O'Nolan`);

            // can handle regex special chars in URL
            filter = encodeURIComponent(`name:~'test+test'`);
            await visit('/');
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "test+test"')
                .to.equal(0);
            expect(find(operatorSelect)).to.have.value('contains');
            expect(find(valueInput)).to.have.value(`test+test`);
        });

        it('can filter by email', async function () {
            this.server.create('member', {email: 'test-1@one.com'});
            this.server.create('member', {email: 'test-2@one.com'});
            this.server.create('member', {email: 'test-1@two.com'});
            this.server.create('member', {email: 'test-2@two.com'});
            this.server.create('member', {email: 'test-3@two.com'});
            this.server.create('member', {email: 'hello@hi.com'});
            this.server.create('member', {email: 'with+plus@fuzzy.org'});

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(7);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelect = `[data-test-members-filter="0"]`;
            const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
            const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
            const valueInput = `${filterSelect} [data-test-input="members-filter-value"]`;

            expect(find(`${filterSelect} [data-test-select="members-filter"] option[value="email"]`), 'email filter option').to.exist;

            await fillIn(typeSelect, 'email');

            // has the right operators
            const operatorOptions = findAll(`${operatorSelect} option`);
            expect(operatorOptions).to.have.length(5);
            expect(operatorOptions[0]).to.have.value('is');
            expect(operatorOptions[1]).to.have.value('contains');
            expect(operatorOptions[2]).to.have.value('does-not-contain');
            expect(operatorOptions[3]).to.have.value('starts-with');
            expect(operatorOptions[4]).to.have.value('ends-with');

            // has expected default operator and value
            expect(find(operatorSelect)).to.have.value('is');
            expect(find(valueInput)).to.have.value('');

            // can change filter
            await fillIn(valueInput, 'hello@hi.com');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is "hello@hi.com"')
                .to.equal(1);

            // can change operator
            await fillIn(operatorSelect, 'contains');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "hello"')
                .to.equal(1);

            // contains query works
            await fillIn(valueInput, 'test');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "test"')
                .to.equal(5);

            // starts with query works
            await fillIn(operatorSelect, 'starts-with');
            await fillIn(valueInput, 'test-2');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - starts with "test-2"')
                .to.equal(2);

            // ends with query works
            await fillIn(operatorSelect, 'ends-with');
            await fillIn(valueInput, '.com');
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - ends with ".com"')
                .to.equal(6);

            // does not contain query works
            await fillIn(operatorSelect, 'does-not-contain');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - does not contain ".com"')
                .to.equal(1);

            // can query with special chars
            await fillIn(operatorSelect, 'contains');
            await fillIn(valueInput, `with+plus`);
            await blur(valueInput);
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "with+plus"')
                .to.equal(1);

            // no duplicate column added (email is included in the "details" column)
            expect(find('[data-test-table-column="email"]')).to.not.exist;

            // can handle contains operator in URL
            let filter = encodeURIComponent(`email:~'hello'`);
            await visit('/');
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "hello"')
                .to.equal(1);
            expect(find(operatorSelect)).to.have.value('contains');
            expect(find(valueInput)).to.have.value('hello');
        });

        it('can filter by next billing date', async function () {
            clock = sinon.useFakeTimers({
                now: moment('2022-03-01 09:00:00.000Z').toDate(),
                shouldAdvanceTime: true
            });

            // add some members to filter
            this.server.createList('member', 3).forEach(member => this.server.create('subscription', {member, currentPeriodEnd: moment('2022-02-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')}));
            this.server.createList('member', 4).forEach(member => this.server.create('subscription', {member, currentPeriodEnd: moment('2022-02-05 12:00:00').format('YYYY-MM-DD HH:mm:ss')}));
            this.server.createList('member', 2);

            await visit('/members');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of initial member rows')
                .to.equal(9);

            await click('[data-test-button="members-filter-actions"]');

            const filterSelect = `[data-test-members-filter="0"]`;
            const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
            const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;

            expect(find(`${filterSelect} [data-test-select="members-filter"] option[value="subscriptions.current_period_end"]`), 'subscriptions.current_period_end filter option').to.exist;

            await fillIn(typeSelect, 'subscriptions.current_period_end');

            // has the right operators
            const operatorOptions = findAll(`${operatorSelect} option`);
            expect(operatorOptions).to.have.length(4);
            expect(operatorOptions[0]).to.have.value('is-less');
            expect(operatorOptions[1]).to.have.value('is-or-less');
            // expect(operatorOptions[2]).to.have.value('is');
            // expect(operatorOptions[3]).to.have.value('is-not');
            expect(operatorOptions[2]).to.have.value('is-greater');
            expect(operatorOptions[3]).to.have.value('is-or-greater');

            const valueDateInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
            const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`;

            // operator defaults to "on or before"
            expect(find(operatorSelect)).to.have.value('is-or-less');

            // value defaults to today's date
            expect(find(valueDateInput)).to.have.value('2022-03-01');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - default')
                .to.equal(7);

            // can change date
            await datepickerSelect(valueDatePicker, moment.utc('2022-02-03').toDate());
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - 2022-02-03')
                .to.equal(3);

            // can change operator
            await fillIn(operatorSelect, 'is-greater');
            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-greater')
                .to.equal(4);

            // can populate filter from URL
            // TODO: leaving screen is needed, suggests component is not fully reactive and needs to be torn down.
            // - see <Members::Filter> constructor
            await visit(`/`);
            const filter = encodeURIComponent(`subscriptions.current_period_end:<='2022-02-01 23:59:59'`);
            await visit(`/members?filter=${filter}`);
            await click('[data-test-button="members-filter-actions"]');

            expect(find(typeSelect), 'type select - from URL').to.have.value('subscriptions.current_period_end');
            expect(find(operatorSelect), 'operator select - from URL').to.have.value('is-or-less');
            expect(find(valueDateInput), 'date input - from URL').to.have.value('2022-02-01');

            expect(findAll('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL')
                .to.equal(3);

            // it adds extra column to table
            expect(find('[data-test-table-column="subscriptions.current_period_end"]')).to.exist;
            expect(find('[data-test-table-column="subscriptions.current_period_end"]')).to.contain.text('Next billing date');
            expect(findAll('[data-test-table-data="subscriptions.current_period_end"]').length).to.equal(3);
            expect(find('[data-test-table-data="subscriptions.current_period_end"]')).to.contain.text('1 Feb 2022');
            expect(find('[data-test-table-data="subscriptions.current_period_end"]')).to.contain.text('a month ago');
        });

        it('can handle multiple filters', async function () {
            // add some members to filter
            this.server.createList('member', 1).forEach(member => this.server.create('subscription', {member, status: 'active'}));
            this.server.createList('member', 2).forEach(member => this.server.create('subscription', {member, status: 'trialing'}));
            this.server.createList('member', 3, {emailOpenRate: 50}).forEach(member => this.server.create('subscription', {member, status: 'trialing'}));
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

            // all filtered columns are shown
            expect(find('[data-test-table-column="email_open_rate"]')).to.exist;
            expect(find('[data-test-table-column="subscriptions.status"]')).to.exist;

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
            this.server.createList('member', 5).forEach(member => this.server.create('subscription', {member, status: 'active'}));

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

            this.server.createList('member', 3).forEach(member => this.server.create('subscription', {member, status: 'active'}));
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

        it('hides paid filters when stripe isn\'t connected', async function () {
            // disconnect stripe
            this.server.db.settings.update({key: 'paid_members_enabled'}, {value: false});
            this.server.createList('member', 10);

            await visit('/members');
            await click('[data-test-button="members-filter-actions"]');

            expect(
                find('[data-test-members-filter="0"] [data-test-select="members-filter"] optgroup[label="Subscription"]'),
                'Subscription option group doesn\'t exist'
            ).to.not.exist;

            const filterOptions = findAll('[data-test-members-filter="0"] [data-test-select="members-filter"] option')
                .map(option => option.value);

            expect(filterOptions).to.not.include('status');
            expect(filterOptions).to.not.include('subscriptions.plan_interval');
            expect(filterOptions).to.not.include('subscriptions.status');
        });

        it('hides email filters when email is disabled', async function () {
            // disable email
            this.server.db.settings.update({key: 'editor_default_email_recipients'}, {value: 'disabled'});
            this.server.createList('member', 10);

            await visit('/members');
            await click('[data-test-button="members-filter-actions"]');

            expect(
                find('[data-test-members-filter="0"] [data-test-select="members-filter"] optgroup[label="Email"]'),
                'Email option group doesn\'t exist'
            ).to.not.exist;

            const filterOptions = findAll('[data-test-members-filter="0"] [data-test-select="members-filter"] option')
                .map(option => option.value);

            expect(filterOptions).to.not.include('email_count');
            expect(filterOptions).to.not.include('email_opened_count');
            expect(filterOptions).to.not.include('email_open_rate');
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
            this.server.create('member', {name: 'A', email: 'a@aaa.aaa', subscriptions: [this.server.create('subscription', {status: 'active'})]});

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
