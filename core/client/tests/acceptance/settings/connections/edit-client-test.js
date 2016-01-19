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

    let clients = find('[data-test-selector="client-list-item"]').length;

    andThen(function() {
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
      expect(name).to.equal('2f5c4f62913e');
    });

    click('button:contains(Refresh Token)');

    andThen(function() {
      let name = find('[data-test-selector="secret"]').text();
      expect(name).to.equal('');
      expect(currentURL()).to.equal('/settings/connections/edit/ghost-admin/');
    });
  });
});
