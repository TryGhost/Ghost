/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import { expect } from 'chai';
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
      expect(currentURL()).to.equal('/settings/connections/');
    });
  });

  it('can disable a client', function() {
    const role = server.create('role', {name: 'Editor'});
    const user = server.create('user', {roles: [role], slug: 'test-user'});

    authenticateSession(application);
    visit('/settings/connections/edit/ghost-admin/');

    click('button:contains(Disable)');
    return pauseTest();

    andThen(function() {
      expect(currentURL()).to.equal('/settings/connections/edit/ghost-admin/');
    });
  });
});
