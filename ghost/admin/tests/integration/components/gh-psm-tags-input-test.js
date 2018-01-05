import hbs from 'htmlbars-inline-precompile';
import mockPosts from '../../../mirage/config/posts';
import mockTags from '../../../mirage/config/themes';
import wait from 'ember-test-helpers/wait';
import {click, findAll} from 'ember-native-dom-helpers';
import {clickTrigger, selectChoose, typeInSearch} from 'ember-power-select/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

// NOTE: although Mirage has posts<->tags relationship and can respond
// to :post-id/?include=tags all ordering information is lost so we
// need to build the tags array manually
const assignPostWithTags = function postWithTags(context, ...slugs) {
    context.get('store').findRecord('post', 1).then((post) => {
        context.get('store').findAll('tag').then((tags) => {
            slugs.forEach((slug) => {
                post.get('tags').pushObject(tags.findBy('slug', slug));
            });

            context.set('post', post);
        });
    });
};

// TODO: Unskip and fix
// skipped because it was failing most of the time on Travis
// see https://github.com/TryGhost/Ghost/issues/8805
describe.skip('Integration: Component: gh-psm-tags-input', function () {
    setupComponentTest('gh-psm-tags-input', {
        integration: true
    });

    let server;

    beforeEach(function () {
        server = startMirage();
        server.create('user');

        mockPosts(server);
        mockTags(server);

        server.create('post');
        server.create('tag', {name: 'Tag One', slug: 'one'});
        server.create('tag', {name: 'Tag Two', slug: 'two'});
        server.create('tag', {name: 'Tag Three', slug: 'three'});
        server.create('tag', {name: '#Internal Tag', visibility: 'internal', slug: 'internal'});

        this.inject.service('store');
    });

    afterEach(function () {
        server.shutdown();
    });

    it('shows selected tags on render', async function () {
        run(() => {
            assignPostWithTags(this, 'one', 'three');
        });
        await wait();

        await this.render(hbs`{{gh-psm-tags-input post=post}}`);

        let selected = findAll('.tag-token');
        expect(selected.length).to.equal(2);
        expect(selected[0].textContent).to.have.string('Tag One');
        expect(selected[1].textContent).to.have.string('Tag Three');
    });

    it('exposes all tags as options', async function () {
        run(() => {
            this.set('post', this.get('store').findRecord('post', 1));
        });
        await wait();

        await this.render(hbs`{{gh-psm-tags-input post=post}}`);
        await clickTrigger();

        let options = findAll('.ember-power-select-option');
        expect(options.length).to.equal(4);
        expect(options[0].textContent).to.have.string('Tag One');
        expect(options[1].textContent).to.have.string('Tag Two');
        expect(options[2].textContent).to.have.string('Tag Three');
        expect(options[3].textContent).to.have.string('#Internal Tag');
    });

    it('matches options on lowercase tag names', async function () {
        run(() => {
            this.set('post', this.get('store').findRecord('post', 1));
        });
        await wait();

        await this.render(hbs`{{gh-psm-tags-input post=post}}`);
        await clickTrigger();
        await typeInSearch('two');

        let options = findAll('.ember-power-select-option');
        expect(options.length).to.equal(2);
        expect(options[0].textContent).to.have.string('Add "two"...');
        expect(options[1].textContent).to.have.string('Tag Two');
    });

    it('hides create option on exact matches', async function () {
        run(() => {
            this.set('post', this.get('store').findRecord('post', 1));
        });
        await wait();

        await this.render(hbs`{{gh-psm-tags-input post=post}}`);
        await clickTrigger();
        await typeInSearch('Tag Two');

        let options = findAll('.ember-power-select-option');
        expect(options.length).to.equal(1);
        expect(options[0].textContent).to.have.string('Tag Two');
    });

    describe('primary tags', function () {
        it('adds primary tag class to first tag', async function () {
            run(() => {
                assignPostWithTags(this, 'one', 'three');
            });
            await wait();

            await this.render(hbs`{{gh-psm-tags-input post=post}}`);

            let selected = findAll('.tag-token');
            expect(selected.length).to.equal(2);
            expect(selected[0].classList.contains('tag-token--primary')).to.be.true;
            expect(selected[1].classList.contains('tag-token--primary')).to.be.false;
        });

        it('doesn\'t add primary tag class if first tag is internal', async function () {
            run(() => {
                assignPostWithTags(this, 'internal', 'two');
            });
            await wait();

            await this.render(hbs`{{gh-psm-tags-input post=post}}`);

            let selected = findAll('.tag-token');
            expect(selected.length).to.equal(2);
            expect(selected[0].classList.contains('tag-token--primary')).to.be.false;
            expect(selected[1].classList.contains('tag-token--primary')).to.be.false;
        });
    });

    describe('updateTags', function () {
        it('modifies post.tags', async function () {
            run(() => {
                assignPostWithTags(this, 'internal', 'two');
            });
            await wait();

            await this.render(hbs`{{gh-psm-tags-input post=post}}`);
            await selectChoose('.ember-power-select-trigger', 'Tag One');

            expect(
                this.get('post.tags').mapBy('name').join(',')
            ).to.equal('#Internal Tag,Tag Two,Tag One');
        });

        it('destroys new tag records when not selected', async function () {
            run(() => {
                assignPostWithTags(this, 'internal', 'two');
            });
            await wait();

            await this.render(hbs`{{gh-psm-tags-input post=post}}`);
            await clickTrigger();
            await typeInSearch('New');
            await selectChoose('.ember-power-select-trigger', 'Add "New"...');

            let tags = await this.get('store').peekAll('tag');
            expect(tags.get('length')).to.equal(5);

            let removeBtns = findAll('.ember-power-select-multiple-remove-btn');
            await click(removeBtns[removeBtns.length - 1]);

            tags = await this.get('store').peekAll('tag');
            expect(tags.get('length')).to.equal(4);
        });
    });

    describe('createTag', function () {
        it('creates new records', async function () {
            run(() => {
                assignPostWithTags(this, 'internal', 'two');
            });
            await wait();

            await this.render(hbs`{{gh-psm-tags-input post=post}}`);
            await clickTrigger();
            await typeInSearch('New One');
            await selectChoose('.ember-power-select-trigger', 'Add "New One"...');
            await typeInSearch('New Two');
            await selectChoose('.ember-power-select-trigger', 'Add "New Two"...');

            let tags = await this.get('store').peekAll('tag');
            expect(tags.get('length')).to.equal(6);

            expect(tags.findBy('name', 'New One').get('isNew')).to.be.true;
            expect(tags.findBy('name', 'New Two').get('isNew')).to.be.true;
        });
    });
});
