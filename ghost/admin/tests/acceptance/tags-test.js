import {Response} from 'miragejs';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click, currentRouteName, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Tags', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/tags');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects to posts page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/tags');

        expect(currentURL(), 'currentURL').to.equal('/posts');
    });

    it('redirects to site page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/tags');

        expect(currentURL(), 'currentURL').to.equal('/site');
    });

    describe('when logged in', function () {
        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('lists public and internal tags separately', async function () {
            this.server.create('tag', {name: 'B - Third', slug: 'third'});
            this.server.create('tag', {name: 'Z - Last', slug: 'last'});
            this.server.create('tag', {name: '!A - Second', slug: 'second'});
            this.server.create('tag', {name: 'A - First', slug: 'first'});
            this.server.create('tag', {name: '#one', slug: 'hash-one', visibility: 'internal'});
            this.server.create('tag', {name: '#two', slug: 'hash-two', visibility: 'internal'});

            await visit('tags');

            // it loads tags list
            expect(currentURL(), 'currentURL').to.equal('tags');

            // it highlights nav menu
            expect(find('[data-test-nav="tags"]'), 'highlights nav menu item')
                .to.have.class('active');

            // it defaults to public tags
            expect(find('[data-test-tags-nav="public"]')).to.have.attr('data-test-active');
            expect(find('[data-test-tags-nav="internal"]')).to.not.have.attr('data-test-active');

            // it lists all public tags
            expect(findAll('[data-test-tag]'), 'public tag list count')
                .to.have.length(4);

            // tags are in correct order
            let tags = findAll('[data-test-tag]');

            expect(tags[0].querySelector('[data-test-tag-name]')).to.have.trimmed.text('A - First');
            expect(tags[1].querySelector('[data-test-tag-name]')).to.have.trimmed.text('!A - Second');
            expect(tags[2].querySelector('[data-test-tag-name]')).to.have.trimmed.text('B - Third');
            expect(tags[3].querySelector('[data-test-tag-name]')).to.have.trimmed.text('Z - Last');

            // can switch to internal tags
            await click('[data-test-tags-nav="internal"]');

            expect(findAll('[data-test-tag]'), 'internal tag list count').to.have.length(2);
        });

        it('can edit tags', async function () {
            const tag = this.server.create('tag', {name: 'To be edited', slug: 'to-be-edited'});

            await visit('tags');
            await click(`[data-test-tag="${tag.id}"] [data-test-tag-name]`);

            // it maintains active state in nav menu
            expect(find('[data-test-nav="tags"]'), 'highlights nav menu item')
                .to.have.class('active');

            expect(currentURL()).to.equal('/tags/to-be-edited');

            expect(find('[data-test-input="tag-name"]')).to.have.value('To be edited');
            expect(find('[data-test-input="tag-slug"]')).to.have.value('to-be-edited');

            await fillIn('[data-test-input="tag-name"]', 'New tag name');
            await fillIn('[data-test-input="tag-slug"]', 'new-tag-slug');
            await click('[data-test-button="save"]');

            const savedTag = this.server.db.tags.find(tag.id);
            expect(savedTag.name, 'saved tag name').to.equal('New tag name');
            expect(savedTag.slug, 'saved tag slug').to.equal('new-tag-slug');

            await click('[data-test-link="tags-back"]');

            const tagListItem = find('[data-test-tag]');
            expect(tagListItem.querySelector('[data-test-tag-name]')).to.have.trimmed.text('New tag name');
            expect(tagListItem.querySelector('[data-test-tag-slug]')).to.have.trimmed.text('new-tag-slug');
        });

        it('can delete tags', async function () {
            const tag = this.server.create('tag', {name: 'To be edited', slug: 'to-be-edited'});
            this.server.create('post', {tags: [tag]});

            await visit('tags');
            await click(`[data-test-tag="${tag.id}"] [data-test-tag-name]`);

            await click('[data-test-button="delete-tag"]');

            const tagModal = '[data-test-modal="confirm-delete-tag"]';

            expect(find(tagModal)).to.exist;
            expect(find(`${tagModal} [data-test-text="posts-count"]`))
                .to.have.trimmed.text('1 post');

            await click(`${tagModal} [data-test-button="confirm"]`);

            expect(find(tagModal)).to.not.exist;
            expect(currentURL()).to.equal('/tags');
            expect(findAll('[data-test-tag]')).to.have.length(0);
        });

        it('can load tag via slug in url', async function () {
            this.server.create('tag', {name: 'To be edited', slug: 'to-be-edited'});

            await visit('tags/to-be-edited');
            expect(currentURL()).to.equal('tags/to-be-edited');

            expect(find('[data-test-input="tag-name"]')).to.have.value('To be edited');
            expect(find('[data-test-input="tag-slug"]')).to.have.value('to-be-edited');
        });

        it('redirects to 404 when tag does not exist', async function () {
            this.server.get('/tags/slug/unknown/', function () {
                return new Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'Tag not found.', type: 'NotFoundError'}]});
            });

            await visit('tags/unknown');

            expect(currentRouteName()).to.equal('error404');
            expect(currentURL()).to.equal('/tags/unknown');
        });

        it('maintains active state in nav menu when creating a new tag', async function () {
            await visit('tags/new');
            expect(currentURL()).to.equal('tags/new');
            expect(find('[data-test-nav="tags"]'), 'highlights nav menu item')
                .to.have.class('active');
        });
    });
});
