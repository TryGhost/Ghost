import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {click, findAll, render, waitUntil} from '@ember/test-helpers';
import {clickTrigger, selectChoose, typeInSearch} from 'ember-power-select/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';
import {timeout} from 'ember-concurrency';

describe('Integration: Component: gh-members-recipient-select', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = startMirage();
        server.create('user');

        // Stub membersUtils to enable paid members
        this.owner.register('service:membersUtils', Service.extend({
            isStripeEnabled: true
        }));

        // Stub session with a user that has canManageMembers
        const sessionUser = {canManageMembers: true};
        this.owner.register('service:session', Service.extend({
            isAuthenticated: true,
            user: sessionUser
        }));

        // Set up a newsletter mock
        this.set('newsletter', {recipientFilter: 'status:free,status:-free'});
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders Free and Paid checkboxes', async function () {
        this.set('filter', null);
        this.set('onChange', () => {});

        await render(hbs`<GhMembersRecipientSelect
            @filter={{this.filter}}
            @newsletter={{this.newsletter}}
            @onChange={{this.onChange}}
        />`);

        expect(findAll('[data-test-checkbox="free-members"]').length).to.equal(1);
        expect(findAll('[data-test-checkbox="paid-members"]').length).to.equal(1);
    });

    it('shows dropdown when Specific is checked', async function () {
        server.create('tier', {name: 'Premium', slug: 'premium', type: 'paid', active: true});
        server.create('tier', {name: 'Basic', slug: 'basic', type: 'paid', active: true});
        server.create('label', {name: 'VIP', slug: 'vip'});

        this.set('filter', 'status:free');
        this.set('onChange', (filter) => {
            this.set('filter', filter);
        });

        await render(hbs`<GhMembersRecipientSelect
            @filter={{this.filter}}
            @newsletter={{this.newsletter}}
            @onChange={{this.onChange}}
        />`);
        await timeout(100);

        // Should have Specific checkbox
        let specificCheckbox = this.element.querySelector('[data-test-checkbox="specific-members"]');
        expect(specificCheckbox).to.exist;

        // Click specific
        await click('[data-test-checkbox="specific-members"]');
        await timeout(100);

        // Dropdown should appear
        expect(this.element.querySelector('[data-test-select="specific-members"]')).to.exist;

        // Open the dropdown
        await clickTrigger('[data-test-select="specific-members"]');
        await timeout(100);

        let options = findAll('.ember-power-select-option');
        let optionTexts = options.map(o => o.textContent.trim());

        expect(optionTexts).to.include('VIP');
    });

    it('selects specific options and fires onChange with filter', async function () {
        server.create('tier', {name: 'Gold', slug: 'gold', type: 'paid', active: true});
        server.create('tier', {name: 'Silver', slug: 'silver', type: 'paid', active: true});
        server.create('label', {name: 'Newsletter', slug: 'newsletter'});

        let lastFilter;
        this.set('filter', 'status:free');
        this.set('onChange', (filter) => {
            lastFilter = filter;
            this.set('filter', filter);
        });

        await render(hbs`<GhMembersRecipientSelect
            @filter={{this.filter}}
            @newsletter={{this.newsletter}}
            @onChange={{this.onChange}}
        />`);
        await timeout(100);

        // Check specific
        await click('[data-test-checkbox="specific-members"]');
        await timeout(100);

        // Select a label from the dropdown
        await selectChoose('[data-test-select="specific-members"] .ember-power-select-trigger', 'Newsletter');

        expect(lastFilter).to.include('label:newsletter');
        expect(lastFilter).to.include('status:free');
    });

    it('uses server-side search for labels when not all loaded', async function () {
        // Create more than 200 labels (parent loads page 1, child loads page 2)
        server.createList('label', 205);
        server.create('tier', {name: 'Basic', slug: 'basic', type: 'paid', active: true});
        server.create('tier', {name: 'Pro', slug: 'pro', type: 'paid', active: true});

        this.set('filter', 'status:free');
        this.set('onChange', (filter) => {
            this.set('filter', filter);
        });

        await render(hbs`<GhMembersRecipientSelect
            @filter={{this.filter}}
            @newsletter={{this.newsletter}}
            @onChange={{this.onChange}}
        />`);
        await timeout(100);

        // Check specific
        await click('[data-test-checkbox="specific-members"]');
        await timeout(100);

        // Open dropdown and type search term
        await clickTrigger('[data-test-select="specific-members"]');
        await timeout(100);

        await typeInSearch('Label 50');

        // Wait for server-side search request
        await waitUntil(() => server.pretender.handledRequests.some(r => r.url.includes('/labels') && r.queryParams.filter && r.queryParams.filter.includes('name:~')));
    });

    it('selected search result from outside paginated set resolves as token', async function () {
        // Fill page 1 with 100 labels, then add one that won't be in the initial load
        server.createList('label', 100);
        server.create('label', {name: 'Outlier Label', slug: 'outlier-label'});
        server.create('tier', {name: 'Basic', slug: 'basic', type: 'paid', active: true});

        let lastFilter;
        this.set('filter', 'status:free');
        this.set('onChange', (filter) => {
            lastFilter = filter;
            this.set('filter', filter);
        });

        await render(hbs`<GhMembersRecipientSelect
            @filter={{this.filter}}
            @newsletter={{this.newsletter}}
            @onChange={{this.onChange}}
        />`);
        await timeout(100);

        // Check specific
        await click('[data-test-checkbox="specific-members"]');
        await timeout(100);

        // Open dropdown and search for the label outside the paginated set
        await clickTrigger('[data-test-select="specific-members"]');
        await timeout(100);

        await typeInSearch('Outlier Label');
        await waitUntil(() => server.pretender.handledRequests.some(r => r.url.includes('/labels') && r.queryParams.filter && r.queryParams.filter.includes('Outlier Label')));
        await waitUntil(() => findAll('.ember-power-select-option').length > 0);

        // Select the search result
        await selectChoose('[data-test-select="specific-members"] .ember-power-select-trigger', 'Outlier Label');

        expect(lastFilter).to.include('label:outlier-label');

        // The label should appear as a selected token, proving it was registered
        // with labelsManager via addLabel so selectedOptions resolves it
        let tokens = findAll('.ember-power-select-multiple-option');
        expect(tokens.some(t => t.textContent.includes('Outlier Label'))).to.be.true;
    });
});
