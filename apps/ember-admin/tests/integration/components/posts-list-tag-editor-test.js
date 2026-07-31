import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import mockPosts from '../../../mirage/config/posts';
import mockTags from '../../../mirage/config/themes';
import {click, find, findAll, focus, render, settled, triggerKeyEvent, waitFor} from '@ember/test-helpers';
import {clickTrigger, selectChoose} from 'ember-power-select/test-support/helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

class NotificationsStub extends Service {
    notifications = [];
    apiErrors = [];

    showNotification(message, options) {
        this.notifications.push({message, options});
    }

    showAPIError(error, options) {
        this.apiErrors.push({error, options});
    }
}

async function assignPostWithTags(context, {status = 'draft', tags = ['one', 'two']} = {}) {
    const post = await context.store.findRecord('post', 1);
    const allTags = await context.store.findAll('tag');

    post.set('status', status);
    post.get('tags').pushObjects(tags.map(slug => allTags.findBy('slug', slug)));
    context.set('post', post);
    await settled();
    post.rollbackAttributes();
    post.set('status', status);
    context.set('post', post);
}

describe('Integration: Component: posts-list/tag-editor', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = startMirage();
        const author = server.create('user');

        mockPosts(server);
        mockTags(server);

        server.create('post', {id: 1, authors: [author], status: 'draft'});
        server.create('tag', {name: 'Primary tag', slug: 'one'});
        server.create('tag', {name: 'Second tag', slug: 'two'});
        server.create('tag', {name: 'A very long third tag name', slug: 'three'});
        server.create('tag', {name: '#Internal tag', slug: 'internal', visibility: 'internal'});

        this.owner.register('service:notifications', NotificationsStub);
        this.notifications = this.owner.lookup('service:notifications');
        this.session = this.owner.lookup('service:session');
        this.session.user = {isContributor: false};
        this.store = this.owner.lookup('service:store');
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders ordered tags, marks the primary tag, and shows measured overflow', async function () {
        await assignPostWithTags(this, {tags: ['one', 'two', 'three']});
        await render(hbs`<PostsList::TagEditor @post={{post}} style="width: 220px; max-width: 220px" />`);

        const renderedTags = findAll('[data-test-post-tag]');
        expect(renderedTags[0]).to.have.attribute('data-test-post-tag', 'one');
        expect(renderedTags[0]).to.have.class('primary');
        expect(find('[data-test-post-tags-overflow]')).to.exist;
        expect(find('[data-test-post-tags-overflow-tooltip]')).to.contain.text('A very long third tag name');
        expect(find('[data-test-post-tags-overflow]')).to.have.attribute('aria-describedby', 'post-1-overflow-tags');
    });

    it('opens explicitly and can add, remove, and reorder tags with a clear primary tag', async function () {
        await assignPostWithTags(this);
        await render(hbs`<PostsList::TagEditor @post={{post}} />`);

        await click('[data-test-edit-post-tags]');
        expect(find('[data-test-post-tags-popover]')).to.exist;
        expect(find('[data-test-edit-post-tags]')).to.contain.text('Edit tags');
        expect(find('.gh-post-list-tags').contains(find('[data-test-post-tags-popover]'))).to.be.true;
        expect(find('.gh-post-list-tags-order li:first-child')).to.contain.text('Primary');

        await clickTrigger();
        await selectChoose('.gh-post-list-tags-popover', 'A very long third tag name');
        expect(findAll('.gh-post-list-tags-order li')).to.have.length(3);

        await click('[aria-label="Move Second tag earlier"]');
        expect(find('.gh-post-list-tags-order li:first-child')).to.contain.text('Second tag');
        expect(find('.gh-post-list-tags-order li:first-child')).to.contain.text('Primary');

        await click('.ember-power-select-multiple-remove-btn');
        expect(findAll('.gh-post-list-tags-order li')).to.have.length(2);
    });

    it('supports internal tags without incorrectly marking them as primary', async function () {
        await assignPostWithTags(this, {tags: ['internal', 'one']});
        await render(hbs`<PostsList::TagEditor @post={{post}} style="width: 600px; max-width: 600px" />`);

        const renderedTags = findAll('[data-test-post-tag]');
        expect(renderedTags[0]).to.have.attribute('data-test-post-tag', 'internal');
        expect(renderedTags[0]).to.not.have.class('primary');
        expect(renderedTags[0]).to.have.attribute('aria-label', '#Internal tag');
        expect(renderedTags[1]).to.not.have.class('primary');

        await click('[data-test-edit-post-tags]');
        expect(find('[data-test-post-tags-popover]')).to.contain.text('The first tag is primary when it is a public tag.');
        expect(find('.gh-post-list-tags-order li:first-child')).to.contain.text('#Internal tag');
        expect(find('.gh-post-list-tags-order li:first-child')).to.not.contain.text('Primary');

        await click('[aria-label="Move Primary tag earlier"]');
        expect(find('.gh-post-list-tags-order li:first-child')).to.contain.text('Primary tag');
        expect(find('.gh-post-list-tags-order li:first-child')).to.contain.text('Primary');

        const internalToken = findAll('.ember-power-select-multiple-option').find(token => token.textContent.includes('#Internal tag'));
        await click(internalToken.querySelector('.ember-power-select-multiple-remove-btn'));
        expect(find('.gh-post-list-tags-order')).to.not.contain.text('#Internal tag');
    });

    it('saves ordered tags once and shows success', async function () {
        server.timing = 100;
        await assignPostWithTags(this);
        await render(hbs`<PostsList::TagEditor @post={{post}} />`);
        await click('[data-test-edit-post-tags]');
        await click('[aria-label="Move Second tag earlier"]');
        const saveSettled = click('[data-test-button="save-tags"]');
        await waitFor('[data-test-task-button-state="running"]');
        expect(find('[data-test-task-button-state="running"]')).to.contain.text('Saving');

        // A second native click while the first request is pending is ignored.
        find('[data-test-button="save-tags"]').click();
        await saveSettled;

        const updateRequests = server.pretender.handledRequests.filter(request => request.method === 'PUT' && request.url.includes('/posts/1/'));
        expect(updateRequests).to.have.length(1);

        const payload = JSON.parse(updateRequests[0].requestBody);
        expect(payload.posts[0].tags.map(tag => tag.slug)).to.deep.equal(['two', 'one']);
        expect(this.notifications.notifications).to.deep.include({
            message: 'Tags updated.',
            options: {type: 'success'}
        });
        expect(find('[data-test-post-tags-popover]')).to.not.exist;
    });

    it('restores tags and reports an API error when saving fails', async function () {
        server.put('/posts/1/', {}, 500);
        await assignPostWithTags(this);
        await render(hbs`<PostsList::TagEditor @post={{post}} />`);
        await click('[data-test-edit-post-tags]');
        await click('[aria-label="Move Second tag earlier"]');
        await click('[data-test-button="save-tags"]');
        expect(this.post.tags.mapBy('slug')).to.deep.equal(['one', 'two']);
        expect(this.notifications.apiErrors).to.have.length(1);
        expect(find('[data-test-post-tags-popover]')).to.exist;
    });

    it('does not overwrite newer unsaved post changes', async function () {
        await assignPostWithTags(this);
        await render(hbs`<PostsList::TagEditor @post={{post}} />`);
        await click('[data-test-edit-post-tags]');
        await click('[aria-label="Move Second tag earlier"]');

        this.post.set('title', 'A newer title');
        await click('[data-test-button="save-tags"]');

        const updateRequests = server.pretender.handledRequests.filter(request => request.method === 'PUT' && request.url.includes('/posts/1/'));
        expect(updateRequests).to.be.empty;
        expect(this.post.title).to.equal('A newer title');
        expect(this.post.tags.mapBy('slug')).to.deep.equal(['one', 'two']);
        expect(this.notifications.notifications.at(-1).options.type).to.equal('error');
    });

    it('hides editing for a contributor viewing a published post', async function () {
        this.session.user = {isContributor: true};
        await assignPostWithTags(this, {status: 'published'});
        await render(hbs`<PostsList::TagEditor @post={{post}} />`);
        expect(find('[data-test-edit-post-tags]')).to.not.exist;
        expect(findAll('[data-tag-measure]')).to.have.length(2);
    });

    it('closes with Escape and restores focus to the edit button', async function () {
        await assignPostWithTags(this);
        await render(hbs`<PostsList::TagEditor @post={{post}} />`);

        const editButton = find('[data-test-edit-post-tags]');
        await click(editButton);
        await waitFor('[data-test-post-tags-popover]');
        await triggerKeyEvent(document.activeElement, 'keydown', 'Escape');

        expect(find('[data-test-post-tags-popover]')).to.not.exist;
        expect(document.activeElement).to.equal(editButton);
    });

    it('allows keyboard focus on enabled tag ordering controls', async function () {
        await assignPostWithTags(this);
        await render(hbs`<PostsList::TagEditor @post={{post}} />`);

        await click('[data-test-edit-post-tags]');
        const moveEarlierButton = find('[aria-label="Move Second tag earlier"]');
        expect(moveEarlierButton).to.not.have.attribute('disabled');
        expect(moveEarlierButton.tabIndex).to.equal(0);

        await focus(moveEarlierButton);
        expect(document.activeElement).to.equal(moveEarlierButton);
    });
});
