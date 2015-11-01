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

const {run} = Ember;

describe('Acceptance: Settings - Navigation', function () {
    let application,
        store,
        server;

    beforeEach(function () {
        application = startApp();
        store = application.__container__.lookup('service:store');
        server = new Pretender(function () {
            // TODO: This needs to either be fleshed out to include all user data, or be killed with fire
            // as it needs to be loaded with all authenticated page loads
            this.get('/ghost/api/v0.1/users/me', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({users: []})];
            });

            this.get('/ghost/api/v0.1/settings/', function (_request) {
                let response = {meta: {filters: 'blog,theme'}};
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
                let response = {meta: {}};
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
        invalidateSession(application);
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

        authenticateSession(application);
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

            authenticateSession(application);
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
