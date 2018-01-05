/* eslint-disable camelcase */
import $ from 'jquery';
import destroyApp from '../../helpers/destroy-app';
import startApp from '../../helpers/start-app';
import wait from 'ember-test-helpers/wait';
import {Response} from 'ember-cli-mirage';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {authenticateSession, invalidateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';
import {errorOverride, errorReset} from 'ghost-admin/tests/helpers/adapter-error';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {timeout} from 'ember-concurrency';

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

describe('Acceptance: Settings - Tags', function () {
    let application;

    beforeEach(function () {
        application = startApp();
    });

    afterEach(function () {
        destroyApp(application);
    });

    it('redirects to signin when not authenticated', async function () {
        invalidateSession(application);
        await visit('/settings/tags');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects to team page when authenticated as author', async function () {
        let role = server.create('role', {name: 'Author'});
        server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        await visit('/settings/design');

        expect(currentURL(), 'currentURL').to.equal('/team/test-user');
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});

            return authenticateSession(application);
        });

        it('it renders, can be navigated, can edit, create & delete tags', async function () {
            let tag1 = server.create('tag');
            let tag2 = server.create('tag');

            await visit('/settings/tags');

            // second wait is needed for the vertical-collection to settle
            await wait();

            // it redirects to first tag
            expect(currentURL(), 'currentURL').to.equal(`/settings/tags/${tag1.slug}`);

            // it has correct page title
            expect(document.title, 'page title').to.equal('Settings - Tags - Test Blog');

            // it highlights nav menu
            expect($('.gh-nav-settings-tags').hasClass('active'), 'highlights nav menu item')
                .to.be.true;

            // it lists all tags
            expect(find('.settings-tags .settings-tag').length, 'tag list count')
                .to.equal(2);
            expect(find('.settings-tags .settings-tag:first .tag-title').text(), 'tag list item title')
                .to.equal(tag1.name);

            // it highlights selected tag
            expect(find(`a[href="/ghost/settings/tags/${tag1.slug}"]`).hasClass('active'), 'highlights selected tag')
                .to.be.true;

            // it shows selected tag form
            expect(find('.tag-settings-pane h4').text(), 'settings pane title')
                .to.equal('Tag Settings');
            expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                .to.equal(tag1.name);

            // click the second tag in the list
            await click('.tag-edit-button:last');

            // it navigates to selected tag
            expect(currentURL(), 'url after clicking tag').to.equal(`/settings/tags/${tag2.slug}`);

            // it highlights selected tag
            expect(find(`a[href="/ghost/settings/tags/${tag2.slug}"]`).hasClass('active'), 'highlights selected tag')
                .to.be.true;

            // it shows selected tag form
            expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                .to.equal(tag2.name);

            // simulate up arrow press
            run(() => {
                keydown(38);
                keyup(38);
            });

            await wait();

            // it navigates to previous tag
            expect(currentURL(), 'url after keyboard up arrow').to.equal(`/settings/tags/${tag1.slug}`);

            // it highlights selected tag
            expect(find(`a[href="/ghost/settings/tags/${tag1.slug}"]`).hasClass('active'), 'selects previous tag')
                .to.be.true;

            // simulate down arrow press
            run(() => {
                keydown(40);
                keyup(40);
            });

            await wait();

            // it navigates to previous tag
            expect(currentURL(), 'url after keyboard down arrow').to.equal(`/settings/tags/${tag2.slug}`);

            // it highlights selected tag
            expect(find(`a[href="/ghost/settings/tags/${tag2.slug}"]`).hasClass('active'), 'selects next tag')
                .to.be.true;

            // trigger save
            await fillIn('.tag-settings-pane input[name="name"]', 'New Name');
            await triggerEvent('.tag-settings-pane input[name="name"]', 'blur');

            // check we update with the data returned from the server
            expect(find('.settings-tags .settings-tag:last .tag-title').text(), 'tag list updates on save')
                .to.equal('New Name');
            expect(find('.tag-settings-pane input[name="name"]').val(), 'settings form updates on save')
                .to.equal('New Name');

            // start new tag
            await click('.view-actions .gh-btn-green');

            // it navigates to the new tag route
            expect(currentURL(), 'new tag URL').to.equal('/settings/tags/new');

            // it displays the new tag form
            expect(find('.tag-settings-pane h4').text(), 'settings pane title')
                .to.equal('New Tag');

            // all fields start blank
            find('.tag-settings-pane input, .tag-settings-pane textarea').each(function () {
                expect($(this).val(), `input field for ${$(this).attr('name')}`)
                    .to.be.blank;
            });

            // save new tag
            await fillIn('.tag-settings-pane input[name="name"]', 'New Tag');
            await triggerEvent('.tag-settings-pane input[name="name"]', 'blur');

            // extra timeout needed for FF on Linux - sometimes it doesn't update
            // quick enough, especially on Travis, and an extra wait() call
            // doesn't help
            await timeout(100);

            // it redirects to the new tag's URL
            expect(currentURL(), 'URL after tag creation').to.equal('/settings/tags/new-tag');

            // it adds the tag to the list and selects
            expect(find('.settings-tags .settings-tag').length, 'tag list count after creation')
                .to.equal(3);
            expect(find('.settings-tags .settings-tag:last .tag-title').text(), 'new tag list item title')
                .to.equal('New Tag');
            expect(find('a[href="/ghost/settings/tags/new-tag"]').hasClass('active'), 'highlights new tag')
                .to.be.true;

            // delete tag
            await click('.settings-menu-delete-button');
            await click('.fullscreen-modal .gh-btn-red');

            // it redirects to the first tag
            expect(currentURL(), 'URL after tag deletion').to.equal(`/settings/tags/${tag1.slug}`);

            // it removes the tag from the list
            expect(find('.settings-tags .settings-tag').length, 'tag list count after deletion')
                .to.equal(2);
        });

        // TODO: Unskip and fix
        // skipped because it was failing most of the time on Travis
        // see https://github.com/TryGhost/Ghost/issues/8805
        it.skip('loads tag via slug when accessed directly', async function () {
            server.createList('tag', 2);

            await visit('/settings/tags/tag-1');

            // second wait is needed for the vertical-collection to settle
            await wait();

            expect(currentURL(), 'URL after direct load').to.equal('/settings/tags/tag-1');

            // it loads all other tags
            expect(find('.settings-tags .settings-tag').length, 'tag list count after direct load')
                .to.equal(2);

            // selects tag in list
            expect(find('a[href="/ghost/settings/tags/tag-1"]').hasClass('active'), 'highlights requested tag')
                .to.be.true;

            // shows requested tag in settings pane
            expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                .to.equal('Tag 1');
        });

        it('shows the internal tag label', async function () {
            server.create('tag', {name: '#internal-tag', slug: 'hash-internal-tag', visibility: 'internal'});

            await visit('settings/tags/');

            // second wait is needed for the vertical-collection to settle
            await wait();

            expect(currentURL()).to.equal('/settings/tags/hash-internal-tag');

            expect(find('.settings-tags .settings-tag').length, 'tag list count')
                .to.equal(1);

            expect(find('.settings-tags .settings-tag:first .label.label-blue').length, 'internal tag label')
                .to.equal(1);

            expect(find('.settings-tags .settings-tag:first .label.label-blue').text().trim(), 'internal tag label text')
                .to.equal('internal');
        });

        it('redirects to 404 when tag does not exist', async function () {
            server.get('/tags/slug/unknown/', function () {
                return new Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'Tag not found.', errorType: 'NotFoundError'}]});
            });

            errorOverride();

            await visit('settings/tags/unknown');

            errorReset();
            expect(currentPath()).to.equal('error404');
            expect(currentURL()).to.equal('/settings/tags/unknown');
        });
    });
});
