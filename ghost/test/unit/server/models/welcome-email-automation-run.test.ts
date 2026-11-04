import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';

const { WelcomeEmailAutomationRun } = models;

describe('Unit: models/welcome-email-automation-run', function () {
  describe('tableName', function () {
    it('uses the correct table name', function () {
      const model = new WelcomeEmailAutomationRun();
      assert.equal(model.tableName, 'welcome_email_automation_runs');
    });
  });

  describe('defaults', function () {
    it('sets step_attempts to 0', function () {
      const model = new WelcomeEmailAutomationRun();
      const defaults = model.defaults();
      assert.equal(defaults.step_attempts, 0);
    });

    it('returns only step_attempts as a default', function () {
      const model = new WelcomeEmailAutomationRun();
      const defaults = model.defaults();
      assert.deepEqual(Object.keys(defaults), ['step_attempts']);
    });
  });

  describe('relationships', function () {
    it('has an automation relationship', function () {
      const model = new WelcomeEmailAutomationRun();
      assert.equal(typeof model.automation, 'function');
    });

    it('has a member relationship', function () {
      const model = new WelcomeEmailAutomationRun();
      assert.equal(typeof model.member, 'function');
    });

    it('has a nextWelcomeEmailAutomatedEmail relationship', function () {
      const model = new WelcomeEmailAutomationRun();
      assert.equal(typeof model.nextWelcomeEmailAutomatedEmail, 'function');
    });
  });
});
