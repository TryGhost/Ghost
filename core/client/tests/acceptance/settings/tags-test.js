/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import Ember from 'ember';
import startApp from '../../helpers/start-app';
import destroyApp from '../../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost/tests/helpers/ember-simple-auth';
import { errorOverride, errorReset } from 'ghost/tests/helpers/adapter-error';
import Mirage from 'ember-cli-mirage';

const {run} = Ember;

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

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/tags');

        andThen(() => {
            expect(currentURL()).to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        let role = server.create('role', {name: 'Author'});
        let user = server.create('user', {roles: [role], slug: 'test-user'});

        authenticateSession(application);
        visit('/settings/navigation');

        andThen(() => {
            expect(currentURL(), 'currentURL').to.equal('/team/test-user');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            let user = server.create('user', {roles: [role]});

            // load the settings fixtures
            // TODO: this should always be run for acceptance tests
            server.loadFixtures();

            return authenticateSession(application);
        });

        it('it renders, can be navigated, can edit, create & delete tags', function () {
            let tag1 = server.create('tag');
            let tag2 = server.create('tag');

            visit('/settings/tags');

            andThen(() => {
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
                expect(find(`a[href="/settings/tags/${tag1.slug}"]`).hasClass('active'), 'highlights selected tag')
                    .to.be.true;

                // it shows selected tag form
                expect(find('.tag-settings-pane h4').text(), 'settings pane title')
                    .to.equal('Tag Settings');
                expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                    .to.equal(tag1.name);
            });

            // click the second tag in the list
            click('.tag-edit-button:last');

            andThen(() => {
                // it navigates to selected tag
                expect(currentURL(), 'url after clicking tag').to.equal(`/settings/tags/${tag2.slug}`);

                // it highlights selected tag
                expect(find(`a[href="/settings/tags/${tag2.slug}"]`).hasClass('active'), 'highlights selected tag')
                    .to.be.true;

                // it shows selected tag form
                expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                    .to.equal(tag2.name);
            });

            andThen(() => {
                // simulate up arrow press
                run(() => {
                    keydown(38);
                    keyup(38);
                });
            });

            andThen(() => {
                // it navigates to previous tag
                expect(currentURL(), 'url after keyboard up arrow').to.equal(`/settings/tags/${tag1.slug}`);

                // it highlights selected tag
                expect(find(`a[href="/settings/tags/${tag1.slug}"]`).hasClass('active'), 'selects previous tag')
                    .to.be.true;
            });

            andThen(() => {
                // simulate down arrow press
                run(() => {
                    keydown(40);
                    keyup(40);
                });
            });

            andThen(() => {
                // it navigates to previous tag
                expect(currentURL(), 'url after keyboard down arrow').to.equal(`/settings/tags/${tag2.slug}`);

                // it highlights selected tag
                expect(find(`a[href="/settings/tags/${tag2.slug}"]`).hasClass('active'), 'selects next tag')
                    .to.be.true;
            });

            // trigger save
            fillIn('.tag-settings-pane input[name="name"]', 'New Name');
            triggerEvent('.tag-settings-pane input[name="name"]', 'blur');

            andThen(() => {
                // check we update with the data returned from the server
                expect(find('.settings-tags .settings-tag:last .tag-title').text(), 'tag list updates on save')
                    .to.equal('New Name');
                expect(find('.tag-settings-pane input[name="name"]').val(), 'settings form updates on save')
                    .to.equal('New Name');
            });

            // start new tag
            click('.view-actions .btn-green');

            andThen(() => {
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
            });

            // save new tag
            fillIn('.tag-settings-pane input[name="name"]', 'New Tag');
            triggerEvent('.tag-settings-pane input[name="name"]', 'blur');

            andThen(() => {
                // it redirects to the new tag's URL
                expect(currentURL(), 'URL after tag creation').to.equal('/settings/tags/new-tag');

                // it adds the tag to the list and selects
                expect(find('.settings-tags .settings-tag').length, 'tag list count after creation')
                    .to.equal(3);
                expect(find('.settings-tags .settings-tag:last .tag-title').text(), 'new tag list item title')
                    .to.equal('New Tag');
                expect(find('a[href="/settings/tags/new-tag"]').hasClass('active'), 'highlights new tag')
                    .to.be.true;
            });

            // delete tag
            click('.tag-delete-button');
            click('.fullscreen-modal .btn-red');

            andThen(() => {
                // it redirects to the first tag
                expect(currentURL(), 'URL after tag deletion').to.equal(`/settings/tags/${tag1.slug}`);

                // it removes the tag from the list
                expect(find('.settings-tags .settings-tag').length, 'tag list count after deletion')
                    .to.equal(2);
            });
        });

        it('loads tag via slug when accessed directly', function () {
            server.createList('tag', 2);

            visit('/settings/tags/tag-1');

            andThen(() => {
                expect(currentURL(), 'URL after direct load').to.equal('/settings/tags/tag-1');

                // it loads all other tags
                expect(find('.settings-tags .settings-tag').length, 'tag list count after direct load')
                    .to.equal(2);

                // selects tag in list
                expect(find('a[href="/settings/tags/tag-1"]').hasClass('active'), 'highlights requested tag')
                    .to.be.true;

                // shows requested tag in settings pane
                expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                    .to.equal('Tag 1');
            });
        });

        it('has infinite scroll pagination of tags list', function () {
            server.createList('tag', 32);

            visit('settings/tags/tag-0');

            andThen(() => {
                // it loads first page
                expect(find('.settings-tags .settings-tag').length, 'tag list count on first load')
                    .to.equal(15);

                find('.tag-list').scrollTop(find('.tag-list-content').height());
            });

            triggerEvent('.tag-list', 'scroll');

            andThen(() => {
                // it loads the second page
                expect(find('.settings-tags .settings-tag').length, 'tag list count on second load')
                    .to.equal(30);

                find('.tag-list').scrollTop(find('.tag-list-content').height());
            });

            triggerEvent('.tag-list', 'scroll');

            andThen(() => {
                // it loads the final page
                expect(find('.settings-tags .settings-tag').length, 'tag list count on third load')
                    .to.equal(32);
            });
        });

        it('redirects to 404 when tag does not exist', function () {
            server.get('/tags/slug/unknown/', function () {
                return new Mirage.Response(404, {'Content-Type': 'application/json'}, {errors: [{message: 'Tag not found.', errorType: 'NotFoundError'}]});
            });

            errorOverride();

            visit('settings/tags/unknown');

            andThen(() => {
                errorReset();
                expect(currentPath()).to.equal('error404');
                expect(currentURL()).to.equal('/settings/tags/unknown');
            });
        });
    });
});
