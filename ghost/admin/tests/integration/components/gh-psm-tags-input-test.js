import hbs from 'htmlbars-inline-precompile';
import mockPosts from '../../../mirage/config/posts';
import mockTags from '../../../mirage/config/themes';
import {click, findAll, render, settled} from '@ember/test-helpers';
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
