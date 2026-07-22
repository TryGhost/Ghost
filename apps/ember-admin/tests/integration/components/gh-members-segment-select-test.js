import hbs from 'htmlbars-inline-precompile';
import {clickTrigger, selectChoose, typeInSearch} from 'ember-power-select/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, findAll, render, settled, waitUntil} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

describe('Integration: Component: gh-members-segment-select', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = startMirage();
        server.create('user');
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders tier and label options', async function () {
        server.create('tier', {name: 'Gold Tier', slug: 'gold', type: 'paid', active: true});
        server.create('label', {name: 'VIP', slug: 'vip'});

        this.set('segment', null);
        this.set('onChange', () => {});

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} />`);
        await clickTrigger();
        await waitUntil(() => findAll('.ember-power-select-option').length >= 4);

        let options = findAll('.ember-power-select-option');
        let optionTexts = options.map(o => o.textContent.trim());

        expect(optionTexts).to.include('Free members');
        expect(optionTexts).to.include('Paid members');
        expect(optionTexts).to.include('Gold Tier');
        expect(optionTexts).to.include('VIP');
    });

    it('selects options and fires onChange', async function () {
        server.create('tier', {name: 'Silver', slug: 'silver', type: 'paid', active: true});
        server.create('label', {name: 'Newsletter', slug: 'newsletter'});

        let lastSegment;
        this.set('segment', null);
        this.set('onChange', (segment) => {
            lastSegment = segment;
            this.set('segment', segment);
        });

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} />`);
        await waitUntil(() => findAll('.ember-power-select-multiple-option').length === 0 && !document.querySelector('.ember-power-select-trigger--active'));

        // Select "Free members"
        await selectChoose('.ember-power-select-trigger', 'Free members');

        expect(lastSegment).to.equal('status:free');
    });

    it('shows selected options on render', async function () {
        server.create('tier', {name: 'Bronze', slug: 'bronze', type: 'paid', active: true});
        server.create('label', {name: 'Premium', slug: 'premium'});

        this.set('segment', 'status:free');
        this.set('onChange', () => {});

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} />`);
        await waitUntil(() => findAll('.ember-power-select-multiple-option').length > 0);

        let tokens = findAll('.ember-power-select-multiple-option');
        expect(tokens.length).to.equal(1);
        expect(tokens[0].textContent).to.include('Free members');
    });

    it('loads labels with infinite scroll', async function () {
        server.create('tier', {name: 'Basic', slug: 'basic', type: 'paid', active: true});

        // Create 105 labels (more than 1 page of 100)
        server.createList('label', 105);

        this.set('segment', null);
        this.set('onChange', () => {});

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} />`);
        await clickTrigger();
        await waitUntil(() => findAll('.ember-power-select-option').length > 0);

        // Verify first page loaded
        let labelRequests = server.pretender.handledRequests.filter(r => r.url.includes('/labels'));
        expect(labelRequests.length).to.be.at.least(1);

        // Scroll to bottom to trigger second page
        const optionsContent = find('.ember-power-select-options');
        optionsContent.scrollTo({top: optionsContent.scrollHeight});
        await settled();

        // Wait for second page request
        await waitUntil(() => server.pretender.handledRequests.some(r => r.url.includes('/labels') && r.queryParams.page === '2'));
    });

    it('uses client-side search when all labels loaded (single page)', async function () {
        // Create fewer than 100 labels (fits in 1 page)
        server.create('label', {name: 'Alpha', slug: 'alpha'});
        server.create('label', {name: 'Beta', slug: 'beta'});

        this.set('segment', null);
        this.set('onChange', () => {});

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} />`);
        await clickTrigger();
        await waitUntil(() => findAll('.ember-power-select-option').length > 0);

        const requestCountBefore = server.pretender.handledRequests.length;

        await typeInSearch('Alpha');

        // No additional API requests should be made for client-side search
        expect(server.pretender.handledRequests.length).to.equal(requestCountBefore);
    });

    it('uses server-side search when not all labels loaded', async function () {
        // Create more than 100 labels to trigger multi-page
        server.createList('label', 105);

        this.set('segment', null);
        this.set('onChange', () => {});

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} />`);
        await clickTrigger();
        await waitUntil(() => findAll('.ember-power-select-option').length > 0);

        await typeInSearch('Label 50');

        // Wait for a search request with filter param containing the typed term
        await waitUntil(() => server.pretender.handledRequests.some(r => r.url.includes('/labels') && r.queryParams.filter && r.queryParams.filter.includes('name:~') && r.queryParams.filter.includes('Label 50')));
    });

    it('selected search result from outside paginated set resolves as token', async function () {
        // Create 100 labels to fill page 1, then one extra that won't be loaded initially
        server.createList('label', 100);
        server.create('label', {name: 'Unique Outlier', slug: 'unique-outlier'});

        let lastSegment;
        this.set('segment', null);
        this.set('onChange', (segment) => {
            lastSegment = segment;
            this.set('segment', segment);
        });

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} />`);
        await clickTrigger();
        await waitUntil(() => findAll('.ember-power-select-option').length > 0);

        // Search for the label that's NOT in the initial paginated set
        await typeInSearch('Unique Outlier');
        await waitUntil(() => server.pretender.handledRequests.some(r => r.url.includes('/labels') && r.queryParams.filter && r.queryParams.filter.includes('Unique Outlier')));
        await waitUntil(() => findAll('.ember-power-select-option').length > 0);

        // Select the search result
        await selectChoose('.ember-power-select-trigger', 'Unique Outlier');

        expect(lastSegment).to.include('label:unique-outlier');

        // The label should appear as a selected token — this proves it was
        // registered with labelsManager via addLabel so selectedOptions resolves it
        let tokens = findAll('.ember-power-select-multiple-option');
        expect(tokens.length).to.equal(1);
        expect(tokens[0].textContent).to.include('Unique Outlier');
    });

    it('respects hideLabels', async function () {
        server.create('label', {name: 'Hidden', slug: 'hidden'});
        server.create('tier', {name: 'Visible', slug: 'visible', type: 'paid', active: true});

        this.set('segment', null);
        this.set('onChange', () => {});

        await render(hbs`<GhMembersSegmentSelect @segment={{this.segment}} @onChange={{this.onChange}} @hideLabels={{true}} />`);
        await clickTrigger();
        await waitUntil(() => findAll('.ember-power-select-option').length > 0);

        let options = findAll('.ember-power-select-option');
        let optionTexts = options.map(o => o.textContent.trim());

        expect(optionTexts).to.not.include('Hidden');
        expect(optionTexts).to.include('Free members');
    });
});
