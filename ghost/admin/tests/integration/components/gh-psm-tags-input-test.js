import hbs from 'htmlbars-inline-precompile';
import mockPosts from '../../../mirage/config/posts';
import mockTags from '../../../mirage/config/themes';
import {click, find, findAll, render, settled, waitUntil} from '@ember/test-helpers';
import {clickTrigger, selectChoose, typeInSearch} from 'ember-power-select/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';
import {timeout} from 'ember-concurrency';

// NOTE: although Mirage has posts<->tags relationship and can respond
// to :post-id/?include=tags all ordering information is lost so we
// need to build the tags array manually
const assignPostWithTags = async function postWithTags(context, ...slugs) {
    let post = await context.store.findRecord('post', 1);
    let tags = await context.store.findAll('tag');

    slugs.forEach((slug) => {
        post.get('tags').pushObject(tags.findBy('slug', slug));
    });

    context.set('post', post);
    await settled();
};

describe('Integration: Component: gh-psm-tags-input', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = startMirage();
        let author = server.create('user');

        mockPosts(server);
        mockTags(server);

        server.create('post', {authors: [author]});
        server.create('tag', {name: 'Tag 1', slug: 'one'});
        server.create('tag', {name: '#Tag 2', visibility: 'internal', slug: 'two'});
        server.create('tag', {name: 'Tag 3', slug: 'three'});
        server.create('tag', {name: 'Tag 4', slug: 'four'});

        this.set('store', this.owner.lookup('service:store'));
    });

    afterEach(function () {
        server.shutdown();
    });

    it('shows selected tags on render', async function () {
        await assignPostWithTags(this, 'one', 'three');
        await render(hbs`<GhPsmTagsInput @post={{post}} />`);

        let selected = findAll('.tag-token');
        expect(selected.length).to.equal(2);
        expect(selected[0]).to.contain.text('Tag 1');
        expect(selected[1]).to.contain.text('Tag 3');
    });

    // skipped because FF 85 on Linux (CI) is failing. FF 85 on mac is fine.
    // possible difference in `localeCompare()` across systems
    it.skip('exposes all tags as options sorted alphabetically', async function () {
        this.set('post', this.store.findRecord('post', 1));
        await settled();

        await render(hbs`<GhPsmTagsInput @post={{post}} />`);
        await clickTrigger();
        await settled();
        // unsure why settled() is sometimes not catching the update
        await timeout(100);

        let options = findAll('.ember-power-select-option');
        expect(options.length).to.equal(4);
        expect(options[0]).to.contain.text('Tag 1');
        expect(options[1]).to.contain.text('#Tag 2');
        expect(options[2]).to.contain.text('Tag 3');
        expect(options[3]).to.contain.text('Tag 4');
    });

    it('uses local search if all tags have been loaded in first page', async function () {
        this.set('post', this.store.findRecord('post', 1));
        await settled();

        await render(hbs`<GhPsmTagsInput @post={{post}} />`);
        await clickTrigger();
        await settled();

        const requestCount = server.pretender.handledRequests.length;
        await waitUntil(() => findAll('.ember-power-select-option').length >= 4);

        await typeInSearch('2');
        await settled();

        expect(server.pretender.handledRequests.length).to.equal(requestCount);
    });

    it('uses local search if all tags have been loaded by scrolling', async function () {
        // create > 1 page of tags. Left-pad the names to ensure they're sorted alphabetically
        server.db.tags.remove(); // clear existing tags that will mess with alphabetical sorting
        server.createList('tag', 150, {name: i => `Tag ${i.toString().padStart(3, '0')}`});

        this.set('post', this.store.findRecord('post', 1));
        await settled();

        await render(hbs`<GhPsmTagsInput @post={{post}} />`);
        await clickTrigger();
        // although we load 100 per page, we'll never have more 50 options rendered
        // because we use vertical-collection to recycle dom elements on scroll
        await waitUntil(() => findAll('.ember-power-select-option').length >= 50, {timeoutMessage: 'Timed out waiting for first page loaded state'});

        // scroll to the bottom of the options to load the next page
        const optionsContent = find('.ember-power-select-options');
        optionsContent.scrollTo({top: optionsContent.scrollHeight});
        await settled();

        // wait for second page to be loaded
        await waitUntil(() => server.pretender.handledRequests.some(r => r.queryParams.page === '2'));
        optionsContent.scrollTo({top: optionsContent.scrollHeight});
        await waitUntil(() => findAll('.ember-power-select-option').some(o => o.textContent.includes('Tag 105')), {timeoutMessage: 'Timed out waiting for second page loaded state'});

        // capture current request count - we test that it doesn't change to indicate a client-side filter
        const requestCount = server.pretender.handledRequests.length;
        await typeInSearch('21');
        await settled();

        // wait until we're sure we've filtered
        await waitUntil(() => findAll('.ember-power-select-option').length <= 5, {timeoutMessage: 'Timed out waiting for filtered state'});

        // request count should not increase if we've used client-side filtering
        expect(server.pretender.handledRequests.length).to.equal(requestCount);
    });

    describe('client-side search', function () {
        it('matches options on lowercase tag names', async function () {
            this.set('post', this.store.findRecord('post', 1));
            await settled();

            await render(hbs`<GhPsmTagsInput @post={{post}} />`);
            await clickTrigger();
            await typeInSearch('2');
            await settled();
            // unsure why settled() is sometimes not catching the update
            await timeout(100);

            let options = findAll('.ember-power-select-option');
            expect(options.length).to.equal(2);
            expect(options[0]).to.contain.text('Add "2"...');
            expect(options[1]).to.contain.text('Tag 2');
        });

        it('hides create option on exact matches', async function () {
            this.set('post', this.store.findRecord('post', 1));
            await settled();

            await render(hbs`<GhPsmTagsInput @post={{post}} />`);
            await clickTrigger();
            await typeInSearch('#Tag 2');
            await settled();
            // unsure why settled() is sometimes not catching the update
            await timeout(100);

            let options = findAll('.ember-power-select-option');
            expect(options.length).to.equal(1);
            expect(options[0]).to.contain.text('#Tag 2');
        });

        it('can search for tags with single quotes', async function () {
            server.create('tag', {name: 'O\'Nolan', slug: 'quote-test'});

            this.set('post', this.store.findRecord('post', 1));
            await settled();

            await render(hbs`<GhPsmTagsInput @post={{post}} />`);
            await clickTrigger();
            await typeInSearch(`O'`);
            await settled();

            let options = findAll('.ember-power-select-option');
            expect(options.length).to.equal(2);
            expect(options[0]).to.contain.text(`Add "O'"...`);
            expect(options[1]).to.contain.text(`O'Nolan`);
        });
    });

    describe('server-side search', function () {

    });

    it('highlights internal tags', async function () {
        await assignPostWithTags(this, 'two', 'three');
        await render(hbs`<GhPsmTagsInput @post={{post}} />`);

        let selected = findAll('.tag-token');
        expect(selected.length).to.equal(2);
        expect(selected[0]).to.have.class('tag-token--internal');
        expect(selected[1]).to.not.have.class('tag-token--internal');
    });

    describe('updateTags', function () {
        it('modifies post.tags', async function () {
            await assignPostWithTags(this, 'two', 'three');
            await render(hbs`<GhPsmTagsInput @post={{post}} />`);
            await selectChoose('.ember-power-select-trigger', 'Tag 1');

            expect(
                this.post.tags.mapBy('name').join(',')
            ).to.equal('#Tag 2,Tag 3,Tag 1');
        });

        // TODO: skipped due to consistently random failures on Travis
        // '#ember-basic-dropdown-content-ember17494 Add "New"...' is not a valid selector
        // https://github.com/TryGhost/Ghost/issues/10308
        it.skip('destroys new tag records when not selected', async function () {
            await assignPostWithTags(this, 'two', 'three');
            await render(hbs`<GhPsmTagsInput @post={{post}} />`);
            await clickTrigger();
            await typeInSearch('New');
            await settled();
            await selectChoose('.ember-power-select-trigger', 'Add "New"...');

            let tags = await this.store.peekAll('tag');
            expect(tags.length).to.equal(5);

            let removeBtns = findAll('.ember-power-select-multiple-remove-btn');
            await click(removeBtns[removeBtns.length - 1]);

            tags = await this.store.peekAll('tag');
            expect(tags.length).to.equal(4);
        });
    });

    describe('createTag', function () {
        it('creates new records', async function () {
            await assignPostWithTags(this, 'two', 'three');
            await render(hbs`<GhPsmTagsInput @post={{post}} />`);
            await clickTrigger();
            await typeInSearch('New One');
            await settled();
            await selectChoose('.ember-power-select-trigger', '.ember-power-select-option', 0);
            await typeInSearch('New Two');
            await settled();
            await selectChoose('.ember-power-select-trigger', '.ember-power-select-option', 0);

            let tags = await this.store.peekAll('tag');
            expect(tags.length).to.equal(6);

            expect(tags.findBy('name', 'New One').isNew).to.be.true;
            expect(tags.findBy('name', 'New Two').isNew).to.be.true;
        });
    });
});
