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
    it('sets stepAttempts to 0', function () {
      const model = new WelcomeEmailAutomationRun();
      const defaults = model.defaults();
      assert.equal(defaults.stepAttempts, 0);
    });

    it('returns only stepAttempts as a default', function () {
      const model = new WelcomeEmailAutomationRun();
      const defaults = model.defaults();
      assert.deepEqual(Object.keys(defaults), ['stepAttempts']);
    });
  });

  describe('relationships', function () {
    it('belongs to an automation', function () {
      const model = new WelcomeEmailAutomationRun();
      const { relatedData } = model.automation();

      assert.equal(relatedData.type, 'belongsTo');
      assert.equal(relatedData.targetTableName, 'automations');
      assert.equal(relatedData.foreignKey, 'welcome_email_automation_id');
      assert.equal(relatedData.targetIdAttribute, 'id');
    });

    it('belongs to a member', function () {
      const model = new WelcomeEmailAutomationRun();
      const { relatedData } = model.member();

      assert.equal(relatedData.type, 'belongsTo');
      assert.equal(relatedData.targetTableName, 'members');
      assert.equal(relatedData.foreignKey, 'member_id');
      assert.equal(relatedData.targetIdAttribute, 'id');
    });

    it('belongs to the next welcome email automated email', function () {
      const model = new WelcomeEmailAutomationRun();
      const { relatedData } = model.nextWelcomeEmailAutomatedEmail();

      assert.equal(relatedData.type, 'belongsTo');
      assert.equal(relatedData.targetTableName, 'welcome_email_automated_emails');
      assert.equal(relatedData.foreignKey, 'next_welcome_email_automated_email_id');
      assert.equal(relatedData.targetIdAttribute, 'id');
    });
  });
});
