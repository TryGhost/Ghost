/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect, assert} from 'chai';
import startApp from '../../../helpers/start-app';
import destroyApp from '../../../helpers/destroy-app';
import { invalidateSession, authenticateSession } from 'ghost/tests/helpers/ember-simple-auth';
import Mirage from 'ember-cli-mirage';

describe('Acceptance: Settings: Connections', function() {
  var application;

  beforeEach(function() {
    application = startApp();
  });

  afterEach(function() {
    Ember.run(application, 'destroy');
  });

  it('can visit connections screen', function() {
    const role = server.create('role', {name: 'Editor'});
    const user = server.create('user', {roles: [role], slug: 'test-user'});

    authenticateSession(application);
    visit('/settings/connections/');

    andThen(function() {
          let clients = find('[data-test-selector="client-list-item"]').length;
          expect(currentURL()).to.equal('/settings/connections/');
          assert.equal(clients, 3, '3 clients are displayed');
    });
});

  it('can disable a client', function() {
    const role = server.create('role', {name: 'Editor'});
    const user = server.create('user', {roles: [role], slug: 'test-user'});

    authenticateSession(application);
    visit('/settings/connections/edit/ghost-admin/');

    click('button:contains(Disable)');

    andThen(function() {
      let name = find('[data-test-selector="status"]').text();
      expect(name).to.equal('disabled');
      expect(currentURL()).to.equal('/settings/connections/edit/ghost-admin/');
    });
  });

  it('can refresh a client secret', function() {
    const role = server.create('role', {name: 'Editor'});
    const user = server.create('user', {roles: [role], slug: 'test-user'});

    authenticateSession(application);
    visit('/settings/connections/edit/ghost-admin/');

    andThen(function() {
      let name = find('[data-test-selector="secret"]').text();
      expect(name).to.equal('bf9b141079f9');
    });

    click('button:contains(Refresh Token)');

    andThen(function() {
      let name = find('[data-test-selector="secret"]').text();
      expect(name).to.equal('');
      expect(currentURL()).to.equal('/settings/connections/edit/ghost-admin/');
    });
  });

  it('can create a client', function() {
    const role = server.create('role', {name: 'Editor'});
    const user = server.create('user', {roles: [role], slug: 'test-user'});

    authenticateSession(application);
    visit('/settings/connections/new/');
    fillIn('[data-test-selector="name"] input', 'New Client');
    fillIn('[data-test-selector="description"] textarea', 'Description for a client');
    click('[data-test-selector="save-btn"]');

    andThen(function() {
        expect(currentURL()).to.equal('/settings/connections');
        let clients = find('[data-test-selector="client-list-item"]');
        assert.equal(clients.length, 4);
    });
  });

  it('can not submit form which has not passed validation', function() {
    const role = server.create('role', {name: 'Editor'});
    const user = server.create('user', {roles: [role], slug: 'test-user'});

    authenticateSession(application);
    visit('/settings/connections/new/');
    click('[data-test-selector="save-btn"]');

    andThen(function() {
        let error = find('p:contains(You must specify a name for the client.)');
        expect(currentURL()).to.equal('/settings/connections/new/');
        assert.equal(error.length, 1);
    });
  });

  it('can edit a client', function() {
    const role = server.create('role', {name: 'Editor'});
    const user = server.create('user', {roles: [role], slug: 'test-user'});

    authenticateSession(application);
    visit('/settings/connections/');
    click('span:contains(Test Client)');
    andThen(function() {
        expect(currentURL()).to.equal('/settings/connections/edit/test-client');
    });
    fillIn('[data-test-selector="name"] input', 'Different Client Name');
    click('[data-test-selector="save-btn"]');

    andThen(function() {
        expect(currentURL()).to.equal('/settings/connections');
        let client = find('[data-test-selector="client-list-item"]:contains("Different Client Name")');
        expect(client).to.have.length(1);
    });
  });
});
