/* jshint expr:true */
import {
  describe,
  it,
  beforeEach,
  afterEach
} from 'mocha';
import { expect } from 'chai';
import Ember from 'ember';
import startApp from '../helpers/start-app';

describe('Acceptance: SettingsConnectionsEditClient', function() {
  var application;

  beforeEach(function() {
    application = startApp();
  });

  afterEach(function() {
    Ember.run(application, 'destroy');
  });

  it('can visit /settings/connections/edit-client', function() {
    visit('/settings/connections/edit-client');
    return pauseTest();

    andThen(function() {
      expect(currentPath()).to.equal('settings/connections/edit-client');
    });
  });
});
