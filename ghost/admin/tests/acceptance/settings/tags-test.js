import windowProxy from 'ghost-admin/utils/window-proxy';
import {Response} from 'miragejs';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {blur, click, currentRouteName, currentURL, fillIn, find, findAll, settled} from '@ember/test-helpers';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {timeout} from 'ember-concurrency';
import {visit} from '../../helpers/visit';

// Grabbed from keymaster's testing code because Ember's `keyEvent` helper
// is for some reason not triggering the events in a way that keymaster detects:
// https://github.com/madrobby/keymaster/blob/master/test/keymaster.html#L31
const modifierMap = {
    16: 'shiftKey',
    18: 'altKey',
    17: 'ctrlKey',
    91: 'metaKey'
};
let keydown = function (code, modifiers, el) {
    let event = document.createEvent('Event');
    event.initEvent('keydown', true, true);
    event.keyCode = code;
    if (modifiers && modifiers.length > 0) {
        for (let i in modifiers) {
            event[modifierMap[modifiers[i]]] = true;
        }
    }
    (el || document).dispatchEvent(event);
};
let keyup = function (code, el) {
    let event = document.createEvent('Event');
    event.initEvent('keyup', true, true);
    event.keyCode = code;
    (el || document).dispatchEvent(event);
};

describe.skip('Acceptance: Tags', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/tags');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects to staff page when authenticated as contributor', async function () {
        let role = this.server.create('role', {name: 'Contributor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/settings/staff/test-user');
    });

    it('redirects to staff page when authenticated as author', async function () {
        let role = this.server.create('role', {name: 'Author'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/settings/staff/test-user');
    });

    describe('when logged in', function () {
        let newLocation, originalReplaceState;

        beforeEach(async function () {
            let role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            originalReplaceState = windowProxy.replaceState;
            windowProxy.replaceState = function (params, title, url) {
                newLocation = url;
            };
            newLocation = undefined;

            return await authenticateSession();
        });

        afterEach(function () {
            windowProxy.replaceState = originalReplaceState;
        });

        it('it renders, can be navigated, can edit, create & delete tags', async function () {
            let tag1 = this.server.create('tag');
            let tag2 = this.server.create('tag');

            await visit('/tags');

            // it redirects to first tag
            // expect(currentURL(), 'currentURL').to.equal(`/tags/${tag1.slug}`);

            // it doesn't redirect to first tag
            expect(currentURL(), 'currentURL').to.equal('/tags');

            // it has correct page title
            expect(document.title, 'page title').to.equal('Tags - Test Blog');

            // it highlights nav menu
            expect(find('[data-test-nav="tags"]'), 'highlights nav menu item')
                .to.have.class('active');

            // it lists all tags
            expect(findAll('.tags-list .gh-tags-list-item').length, 'tag list count')
                .to.equal(2);
            let tag = find('.tags-list .gh-tags-list-item');
            expect(tag.querySelector('.gh-tag-list-name').textContent, 'tag list item title')
                .to.equal(tag1.name);

            // it highlights selected tag
            // expect(find(`a[href="/ghost/tags/${tag1.slug}"]`), 'highlights selected tag')
            //     .to.have.class('active');

            await visit(`/tags/${tag1.slug}`);

            // second wait is needed for the tag details to settle

            // it shows selected tag form
            // expect(find('.tag-settings-pane h4').textContent, 'settings pane title')
            //     .to.equal('Tag settings');
            expect(find('.gh-tag-basic-settings-form input[name="name"]').value, 'loads correct tag into form')
                .to.equal(tag1.name);

            // click the second tag in the list
            // let tagEditButtons = findAll('.tag-edit-button');
            // await click(tagEditButtons[tagEditButtons.length - 1]);

            // it navigates to selected tag
            // expect(currentURL(), 'url after clicking tag').to.equal(`/tags/${tag2.slug}`);

            // it highlights selected tag
            // expect(find(`a[href="/ghost/tags/${tag2.slug}"]`), 'highlights selected tag')
            //     .to.have.class('active');

            // it shows selected tag form
            // expect(find('.tag-settings-pane input[name="name"]').value, 'loads correct tag into form')
            //     .to.equal(tag2.name);

            // simulate up arrow press
            run(() => {
                keydown(38);
                keyup(38);
            });

            await settled();

            // it navigates to previous tag
            expect(currentURL(), 'url after keyboard up arrow').to.equal(`/tags/${tag1.slug}`);

            // it highlights selected tag
            // expect(find(`a[href="/ghost/tags/${tag1.slug}"]`), 'selects previous tag')
            //     .to.have.class('active');

            // simulate down arrow press
            run(() => {
                keydown(40);
                keyup(40);
            });

            await settled();

            // it navigates to previous tag
            expect(currentURL(), 'url after keyboard down arrow').to.equal(`/tags/${tag2.slug}`);

            // it highlights selected tag
            // expect(find(`a[href="/ghost/tags/${tag2.slug}"]`), 'selects next tag')
            //     .to.have.class('active');

            // trigger save
            await fillIn('.tag-settings-pane input[name="name"]', 'New Name');
            await blur('.tag-settings-pane input[name="name"]');

            // extra timeout needed for Travis - sometimes it doesn't update
            // quick enough and an extra wait() call doesn't help
            await timeout(100);

            // check we update with the data returned from the server
            let tags = findAll('.settings-tags .settings-tag');
            tag = tags[0];
            expect(tag.querySelector('.tag-title').textContent, 'tag list updates on save')
                .to.equal('New Name');
            expect(find('.tag-settings-pane input[name="name"]').value, 'settings form updates on save')
                .to.equal('New Name');

            // start new tag
            await click('.view-actions .gh-btn-green');

            // it navigates to the new tag route
            expect(currentURL(), 'new tag URL').to.equal('/tags/new');

            // it displays the new tag form
            expect(find('.tag-settings-pane h4').textContent, 'settings pane title')
                .to.equal('New tag');

            // all fields start blank
            findAll('.tag-settings-pane input, .tag-settings-pane textarea').forEach(function (elem) {
                expect(elem.value, `input field for ${elem.getAttribute('name')}`)
                    .to.be.empty;
            });

            // save new tag
            await fillIn('.tag-settings-pane input[name="name"]', 'New tag');
            await blur('.tag-settings-pane input[name="name"]');

            // extra timeout needed for FF on Linux - sometimes it doesn't update
            // quick enough, especially on Travis, and an extra wait() call
            // doesn't help
            await timeout(100);

            // it redirects to the new tag's URL
            expect(currentURL(), 'URL after tag creation').to.equal('/tags/new-tag');

            // it adds the tag to the list and selects
            tags = findAll('.settings-tags .settings-tag');
            tag = tags[1]; // second tag in list due to alphabetical ordering
            expect(tags.length, 'tag list count after creation')
                .to.equal(3);

            // new tag will be second in the list due to alphabetical sorting
            expect(findAll('.settings-tags .settings-tag')[1].querySelector('.tag-title').textContent.trim(), 'new tag list item title');
            expect(tag.querySelector('.tag-title').textContent, 'new tag list item title')
                .to.equal('New tag');
            expect(find('a[href="/ghost/tags/new-tag"]'), 'highlights new tag')
                .to.have.class('active');

            // delete tag
            await click('.settings-menu-delete-button');
            await click('.fullscreen-modal .gh-btn-red');

            // it redirects to the first tag
            expect(currentURL(), 'URL after tag deletion').to.equal(`/tags/${tag1.slug}`);

            // it removes the tag from the list
            expect(findAll('.settings-tags .settings-tag').length, 'tag list count after deletion')
                .to.equal(2);
        });

        // TODO: Unskip and fix
        // skipped because it was failing most of the time on Travis
        // see https://github.com/TryGhost/Ghost/issues/8805
        it.skip('loads tag via slug when accessed directly', async function () {
            this.server.createList('tag', 2);

            await visit('/tags/tag-1');

            expect(currentURL(), 'URL after direct load').to.equal('/tags/tag-1');

            // it loads all other tags
            expect(findAll('.settings-tags .settings-tag').length, 'tag list count after direct load')
                .to.equal(2);

            // selects tag in list
            expect(find('a[href="/ghost/tags/tag-1"]').classList.contains('active'), 'highlights requested tag')
                .to.be.true;

            // shows requested tag in settings pane
            expect(find('.tag-settings-pane input[name="name"]').value, 'loads correct tag into form')
                .to.equal('Tag 1');
        });

        it('shows the internal tag label', async function () {
            this.server.create('tag', {name: '#internal-tag', slug: 'hash-internal-tag', visibility: 'internal'});

            await visit('tags/');

            expect(currentURL()).to.equal('/tags/hash-internal-tag');

            expect(findAll('.settings-tags .settings-tag').length, 'tag list count')
                .to.equal(1);

            let tag = find('.settings-tags .settings-tag');

            expect(tag.querySelectorAll('.label.label-blue').length, 'internal tag label')
                .to.equal(1);

            expect(tag.querySelector('.label.label-blue').textContent.trim(), 'internal tag label text')
                .to.equal('internal');
        });

        it('updates the URL when slug changes', async function () {
            this.server.createList('tag', 2);

            await visit('/tags/tag-1');

            expect(currentURL(), 'URL after direct load').to.equal('/tags/tag-1');

            // update the slug
            await fillIn('.tag-settings-pane input[name="slug"]', 'test');
            await blur('.tag-settings-pane input[name="slug"]');

            // tests don't have a location.hash so we can only check that the
            // slug portion is updated correctly
            expect(newLocation, 'URL after slug change').to.equal('test');
        });

        it('redirects to 404 when tag does not exist', async function () {
            this.server.get('/tags/slug/unknown/', function () {
                return new Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'Tag not found.', type: 'NotFoundError'}]});
            });

            await visit('tags/unknown');

            expect(currentRouteName()).to.equal('error404');
            expect(currentURL()).to.equal('/tags/unknown');
        });

        it('sorts tags correctly', async function () {
            this.server.create('tag', {name: 'B - Third', slug: 'third'});
            this.server.create('tag', {name: 'Z - Last', slug: 'last'});
            this.server.create('tag', {name: '#A - Second', slug: 'second'});
            this.server.create('tag', {name: 'A - First', slug: 'first'});

            await visit('tags');

            let tags = findAll('[data-test-tag]');

            expect(tags[0].querySelector('[data-test-name]').textContent.trim()).to.equal('A - First');
            expect(tags[1].querySelector('[data-test-name]').textContent.trim()).to.equal('#A - Second');
            expect(tags[2].querySelector('[data-test-name]').textContent.trim()).to.equal('B - Third');
            expect(tags[3].querySelector('[data-test-name]').textContent.trim()).to.equal('Z - Last');
        });
    });
});
