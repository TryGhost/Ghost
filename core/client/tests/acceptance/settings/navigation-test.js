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
import initializeTestHelpers from 'simple-auth-testing/test-helpers';

initializeTestHelpers();

const { run } = Ember,
    // TODO: Pull this into a fixture or similar when required elsewhere
    requiredSettings = [{
        created_at: '2015-09-11T09:44:30.805Z',
        created_by: 1,
        id: 5,
        key: 'title',
        type: 'blog',
        updated_at: '2015-10-04T16:26:05.195Z',
        updated_by: 1,
        uuid: '39e16daf-43fa-4bf0-87d4-44948ba8bf4c',
        value: 'The Daily Awesome'
    }, {
        created_at: '2015-09-11T09:44:30.806Z',
        created_by: 1,
        id: 6,
        key: 'description',
        type: 'blog',
        updated_at: '2015-10-04T16:26:05.198Z',
        updated_by: 1,
        uuid: 'e6c8b636-6925-4c4a-a5d9-1dc0870fb8ea',
        value: 'Thoughts, stories and ideas.'
    }, {
        created_at: '2015-09-11T09:44:30.809Z',
        created_by: 1,
        id: 10,
        key: 'postsPerPage',
        type: 'blog',
        updated_at: '2015-10-04T16:26:05.211Z',
        updated_by: 1,
        uuid: '775e6ca1-bcc3-4347-a53d-15d5d76c04a4',
        value: '5'
    }, {
        created_at: '2015-09-11T09:44:30.809Z',
        created_by: 1,
        id: 13,
        key: 'ghost_head',
        type: 'blog',
        updated_at: '2015-09-23T13:32:49.858Z',
        updated_by: 1,
        uuid: 'df7f3151-bc08-4a77-be9d-dd315b630d51',
        value: ''
    }, {
        created_at: '2015-09-11T09:44:30.809Z',
        created_by: 1,
        id: 14,
        key: 'ghost_foot',
        type: 'blog',
        updated_at: '2015-09-23T13:32:49.858Z',
        updated_by: 1,
        uuid: '0649d45e-828b-4dd0-8381-3dff6d1d5ddb',
        value: ''
    }];

describe('Acceptance: Settings - Navigation', function () {
    var application,
        store,
        server;

    beforeEach(function () {
        application = startApp();
        store = application.__container__.lookup('store:main');
        server = new Pretender(function () {
            this.get('/ghost/api/v0.1/settings/', function (_request) {
                var response = {meta: {filters: 'blog,theme'}};
                response.settings = [{
                    created_at: '2015-09-11T09:44:30.810Z',
                    created_by: 1,
                    id: 16,
                    key: 'navigation',
                    type: 'blog',
                    updated_at: '2015-09-23T13:32:49.868Z',
                    updated_by: 1,
                    uuid: '4cc51d1c-fcbd-47e6-a71b-fdd1abb223fc',
                    value: JSON.stringify([
                        {label: 'Home', url: '/'},
                        {label: 'About', url: '/about'}
                    ])
                }];
                response.settings.pushObjects(requiredSettings);

                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });

            // TODO: This will be needed for all authenticated page loads
            // - is there some way to make this a default?
            this.get('/ghost/api/v0.1/notifications/', function (_request) {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({notifications: []})];
            });

            this.put('/ghost/api/v0.1/settings/', function (_request) {
                var response = {meta: {}};
                response.settings = [{
                    created_at: '2015-09-11T09:44:30.810Z',
                    created_by: 1,
                    id: 16,
                    key: 'navigation',
                    type: 'blog',
                    updated_at: '2015-09-23T13:32:49.868Z',
                    updated_by: 1,
                    uuid: '4cc51d1c-fcbd-47e6-a71b-fdd1abb223fc',
                    value: JSON.stringify([
                        {label: 'Test', url: '/test'},
                        {label: 'About', url: '/about'}
                    ])
                }];
                response.settings.pushObjects(requiredSettings);

                return [200, {'Content-Type': 'application/json'}, JSON.stringify(response)];
            });
        });
    });

    afterEach(function () {
        Ember.run(application, 'destroy');
    });

    it('redirects to signin when not authenticated', function () {
        invalidateSession();
        visit('/settings/navigation');

        andThen(function () {
            expect(currentPath()).to.not.equal('settings.navigation');
        });
    });

    it('redirects to team page when authenticated as author', function () {
        run(() => {
            let role = store.push('role', {id: 1, name: 'Author'});
            store.push('user', {id: 'me', roles: [role]});
        });

        authenticateSession();
        visit('/settings/navigation');

        andThen(function () {
            expect(currentPath()).to.equal('team.user');
        });
    });

    describe('when logged in', function () {
        beforeEach(function () {
            run(() => {
                let role = store.push('role', {id: 1, name: 'Administrator'});
                store.push('user', {id: 'me', roles: [role]});
            });

            authenticateSession();
        });

        it('can visit /settings/navigation', function () {
            visit('/settings/navigation');

            andThen(function () {
                expect(currentPath()).to.equal('settings.navigation');
                // test has expected number of rows
                expect($('.gh-blognav-item').length).to.equal(3);
            });
        });

        it('saves settings', function () {
            visit('/settings/navigation');
            fillIn('.gh-blognav-label:first input', 'Test');
            fillIn('.gh-blognav-url:first input', '/test');
            triggerEvent('.gh-blognav-url:first input', 'blur');

            click('.btn-blue');

            andThen(function () {
                // TODO: Test for successful save here once we have a visual
                // indication. For now we know the save happened because
                // Pretender doesn't complain about an unknown URL

                // don't test against .error directly as it will pick up failed
                // tests "pre.error" elements
                expect($('span.error').length, 'error fields count').to.equal(0);
                expect($('.gh-alert').length, 'alerts count').to.equal(0);
            });
        });

        it('clears unsaved settings when navigating away', function () {
            visit('/settings/navigation');
            fillIn('.gh-blognav-label:first input', 'Test');
            triggerEvent('.gh-blognav-label:first input', 'blur');

            andThen(function () {
                expect($('.gh-blognav-label:first input').val()).to.equal('Test');
            });

            visit('/settings/code-injection');
            visit('/settings/navigation');

            andThen(function () {
                expect($('.gh-blognav-label:first input').val()).to.equal('Home');
            });
        });
    });
});
