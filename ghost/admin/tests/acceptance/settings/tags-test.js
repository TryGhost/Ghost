/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
import Ember from 'ember';
import startApp from '../../helpers/start-app';
import Pretender from 'pretender';
import { invalidateSession, authenticateSession } from 'ghost/tests/helpers/ember-simple-auth';
import requiredSettings from '../../fixtures/settings';

const {run} = Ember,
    // Grabbed from keymaster's testing code because Ember's `keyEvent` helper
    // is for some reason not triggering the events in a way that keymaster detects:
    // https://github.com/madrobby/keymaster/blob/master/test/keymaster.html#L31
    modifierMap = {
        16:'shiftKey',
        18:'altKey',
        17:'ctrlKey',
        91:'metaKey'
    },
    keydown = function (code, modifiers, el) {
        let event = document.createEvent('Event');
        event.initEvent('keydown', true, true);
        event.keyCode = code;
        if (modifiers && modifiers.length > 0) {
            for (let i in modifiers) {
                event[modifierMap[modifiers[i]]] = true;
            }
        }
        (el || document).dispatchEvent(event);
    },
    keyup = function (code, el) {
        let event = document.createEvent('Event');
        event.initEvent('keyup', true, true);
        event.keyCode = code;
        (el || document).dispatchEvent(event);
    };

describe('Acceptance: Settings - Tags', function () {
    let application,
        store,
        server,
        roleName;

    beforeEach(function () {
        application = startApp();
        store = application.__container__.lookup('service:store');
        server = new Pretender(function () {
            // TODO: This needs to either be fleshed out to include all user data, or be killed with fire
            // as it needs to be loaded with all authenticated page loads
            this.get('/ghost/api/v0.1/users/me', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({users: [{
                    id: '1',
                    roles: [{
                        id: 1,
                        name: roleName,
                        slug: 'barry'
                    }]
                }]})];
            });

            this.get('/ghost/api/v0.1/settings/', function (_request) {
                let response = {meta: {filters: 'blog,theme'}};
                response.settings = requiredSettings;
                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });

            // TODO: This will be needed for all authenticated page loads
            // - is there some way to make this a default?
            this.get('/ghost/api/v0.1/notifications/', function (_request) {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({notifications: []})];
            });

            this.get('/ghost/api/v0.1/tags/', function (_request) {
                let response = {};

                response.meta = {
                    pagination: {
                        page: 1,
                        limit: 15,
                        pages: 1,
                        total: 2,
                        next: null,
                        prev: null
                    }
                };

                response.tags = [
                    {
                        id: 1,
                        parent: null,
                        uuid: 'e2016ef1-4b51-46ff-9388-c6f066fc2e6c',
                        image: '/content/images/2015/10/tag-1.jpg',
                        name: 'Tag One',
                        slug: 'tag-one',
                        description: 'Description one.',
                        meta_title: 'Meta Title One',
                        meta_description: 'Meta description one.',
                        created_at: '2015-09-11T09:44:29.871Z',
                        created_by: 1,
                        updated_at: '2015-10-19T16:25:07.756Z',
                        updated_by: 1,
                        hidden: false,
                        post_count: 1
                    },
                    {
                        id: 2,
                        parent: null,
                        uuid: '0cade0f9-7a3f-4fd1-a80a-3a1ab7028340',
                        image: '/content/images/2015/10/tag-2.jpg',
                        name: 'Tag Two',
                        slug: 'tag-two',
                        description: 'Description two.',
                        meta_title: 'Meta Title Two',
                        meta_description: 'Meta description two.',
                        created_at: '2015-09-11T09:44:29.871Z',
                        created_by: 1,
                        updated_at: '2015-10-19T16:25:07.756Z',
                        updated_by: 1,
                        hidden: false,
                        post_count: 2
                    }
                ];

                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });

            this.get('/ghost/api/v0.1/tags/slug/tag-two/', function (_request) {
                let response = {};

                response.tag = {
                    id: 2,
                    parent: null,
                    uuid: '0cade0f9-7a3f-4fd1-a80a-3a1ab7028340',
                    image: '/content/images/2015/10/tag-2.jpg',
                    name: 'Tag Two',
                    slug: 'tag-two',
                    description: 'Description two.',
                    meta_title: 'Meta Title Two',
                    meta_description: 'Meta description two.',
                    created_at: '2015-09-11T09:44:29.871Z',
                    created_by: 1,
                    updated_at: '2015-10-19T16:25:07.756Z',
                    updated_by: 1,
                    hidden: false,
                    post_count: 2
                };

                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });

            this.put('/ghost/api/v0.1/tags/2/', function (_request) {
                let response = {};

                response.tag = {
                    id: 2,
                    parent: null,
                    uuid: '0cade0f9-7a3f-4fd1-a80a-3a1ab7028340',
                    image: '/content/images/2015/10/tag-2.jpg',
                    name: 'Saved Tag',
                    slug: 'tag-two',
                    description: 'Description two.',
                    meta_title: 'Meta Title Two',
                    meta_description: 'Meta description two.',
                    created_at: '2015-09-11T09:44:29.871Z',
                    created_by: 1,
                    updated_at: '2015-10-19T16:25:07.756Z',
                    updated_by: 1,
                    hidden: false,
                    post_count: 2
                };

                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });

            this.post('/ghost/api/v0.1/tags/', function (_request) {
                let response = {};

                response.tag = {
                    id: 3,
                    parent: null,
                    uuid: 'de9f4636-0398-4e23-a963-e073d12bc511',
                    image: '/content/images/2015/10/tag-3.jpg',
                    name: 'Tag Three',
                    slug: 'tag-three',
                    description: 'Description three.',
                    meta_title: 'Meta Title Three',
                    meta_description: 'Meta description three.',
                    created_at: '2015-09-11T09:44:29.871Z',
                    created_by: 1,
                    updated_at: '2015-10-19T16:25:07.756Z',
                    updated_by: 1,
                    hidden: false,
                    post_count: 2
                };

                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });

            this.delete('/ghost/api/v0.1/tags/3/', function (_request) {
                let response = {tags: []};

                response.tags.push({
                    id: 3,
                    parent: null,
                    uuid: 'de9f4636-0398-4e23-a963-e073d12bc511',
                    image: '/content/images/2015/10/tag-3.jpg',
                    name: 'Tag Three',
                    slug: 'tag-three',
                    description: 'Description three.',
                    meta_title: 'Meta Title Three',
                    meta_description: 'Meta description three.',
                    created_at: '2015-09-11T09:44:29.871Z',
                    created_by: 1,
                    updated_at: '2015-10-19T16:25:07.756Z',
                    updated_by: 1,
                    hidden: false,
                    post_count: 2
                });

                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });
        });
    });

    afterEach(function () {
        Ember.run(application, 'destroy');
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession(application);
        visit('/settings/tags');

        andThen(() => {
            expect(currentURL()).to.equal('/signin');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        roleName = 'Author';
        authenticateSession(application);
        visit('/settings/navigation');

        andThen(() => {
            expect(currentURL()).to.match(/^\/team\//);
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            roleName = 'Administrator';
            authenticateSession(application);
        });

        it('it renders, can be navigated, can edit, create & delete tags', function () {
            visit('/settings/tags');

            andThen(() => {
                // it redirects to first tag
                expect(currentURL(), 'currentURL').to.equal('/settings/tags/tag-one');

                // it has correct page title
                expect(document.title, 'page title').to.equal('Settings - Tags - Test Blog');

                // it highlights nav menu
                expect($('.gh-nav-settings-tags').hasClass('active'), 'highlights nav menu item')
                    .to.be.true;

                // it lists all tags
                expect(find('.settings-tags .settings-tag').length, 'tag list count')
                    .to.equal(2);
                expect(find('.settings-tags .settings-tag:first .tag-title').text(), 'tag list item title')
                    .to.equal('Tag One');

                // it highlights selected tag
                expect(find('a[href="/settings/tags/tag-one"]').hasClass('active'), 'highlights selected tag')
                    .to.be.true;

                // it shows selected tag form
                expect(find('.tag-settings-pane h4').text(), 'settings pane title')
                    .to.equal('Tag Settings');
                expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                    .to.equal('Tag One');
            });

            // click the second tag in the list
            click('.tag-edit-button:last');

            andThen(() => {
                // it navigates to selected tag
                expect(currentURL(), 'url after clicking tag').to.equal('/settings/tags/tag-two');

                // it highlights selected tag
                expect(find('a[href="/settings/tags/tag-two"]').hasClass('active'), 'highlights selected tag')
                    .to.be.true;

                // it shows selected tag form
                expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                    .to.equal('Tag Two');
            });

            andThen(() => {
                // simulate up arrow press
                run(() => {
                    keydown(38);
                    keyup(38);
                });

                // it navigates to previous tag
                expect(currentURL(), 'url after keyboard up arrow').to.equal('/settings/tags/tag-one');

                // it highlights selected tag
                expect(find('a[href="/settings/tags/tag-one"]').hasClass('active'), 'selects previous tag')
                    .to.be.true;
            });

            andThen(() => {
                // simulate down arrow press
                run(() => {
                    keydown(40);
                    keyup(40);
                });

                // it navigates to previous tag
                expect(currentURL(), 'url after keyboard down arrow').to.equal('/settings/tags/tag-two');

                // it highlights selected tag
                expect(find('a[href="/settings/tags/tag-two"]').hasClass('active'), 'selects next tag')
                    .to.be.true;
            });

            // trigger save
            fillIn('.tag-settings-pane input[name="name"]', 'New Name');
            triggerEvent('.tag-settings-pane input[name="name"]', 'blur');

            andThen(() => {
                // check we update with the data returned from the server
                expect(find('.settings-tags .settings-tag:last .tag-title').text(), 'tag list updates on save')
                    .to.equal('Saved Tag');
                expect(find('.tag-settings-pane input[name="name"]').val(), 'settings form updates on save')
                    .to.equal('Saved Tag');
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
                expect(currentURL(), 'URL after tag creation').to.equal('/settings/tags/tag-three');

                // it adds the tag to the list and selects
                expect(find('.settings-tags .settings-tag').length, 'tag list count after creation')
                    .to.equal(3);
                expect(find('.settings-tags .settings-tag:last .tag-title').text(), 'new tag list item title')
                    .to.equal('Tag Three');
                expect(find('a[href="/settings/tags/tag-three"]').hasClass('active'), 'highlights new tag')
                    .to.be.true;
            });

            // delete tag
            click('.tag-delete-button');
            click('.modal-container .btn-red');

            andThen(() => {
                // it redirects to the first tag
                expect(currentURL(), 'URL after tag deletion').to.equal('/settings/tags/tag-one');

                // it removes the tag from the list
                expect(find('.settings-tags .settings-tag').length, 'tag list count after deletion')
                    .to.equal(2);
            });
        });

        it('loads tag via slug when accessed directly', function () {
            visit('/settings/tags/tag-two');

            andThen(() => {
                expect(currentURL(), 'URL after direct load').to.equal('/settings/tags/tag-two');

                // it loads all other tags
                expect(find('.settings-tags .settings-tag').length, 'tag list count after direct load')
                    .to.equal(2);

                // selects tag in list
                expect(find('a[href="/settings/tags/tag-two"]').hasClass('active'), 'highlights requested tag')
                    .to.be.true;

                // shows requested tag in settings pane
                expect(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form')
                    .to.equal('Tag Two');
            });
        });

        it('has infinite scroll pagination of tags list');
    });
});
