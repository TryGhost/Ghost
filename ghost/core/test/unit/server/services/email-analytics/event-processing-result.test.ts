import assert from 'node:assert/strict';

import { EventProcessingResult } from '../../../../../core/server/services/email-analytics/event-processing-result';

describe('EventProcessingResult', function () {
  it('has expected initial state', function () {
    const result = new EventProcessingResult();

    assert.equal(result.delivered, 0);
    assert.equal(result.opened, 0);
    assert.equal(result.temporaryFailed, 0);
    assert.equal(result.permanentFailed, 0);
    assert.equal(result.unsubscribed, 0);
    assert.equal(result.complained, 0);
    assert.equal(result.unhandled, 0);
    assert.equal(result.unprocessable, 0);

    assert.equal(result.processingFailures, 0);

    assert.deepEqual(result.emailIds, []);
    assert.deepEqual(result.memberIds, []);
  });

  it('has expected populated initial state', function () {
    const result = new EventProcessingResult({
      delivered: 1,
      opened: 2,
      temporaryFailed: 3,
      permanentFailed: 4,
      unsubscribed: 5,
      complained: 6,
      unhandled: 7,
      unprocessable: 8,
      processingFailures: 9,
      emailIds: ['1', '2', '3'],
      memberIds: ['4', '5'],
    });

    assert.equal(result.delivered, 1);
    assert.equal(result.opened, 2);
    assert.equal(result.temporaryFailed, 3);
    assert.equal(result.permanentFailed, 4);
    assert.equal(result.unsubscribed, 5);
    assert.equal(result.complained, 6);
    assert.equal(result.unhandled, 7);
    assert.equal(result.unprocessable, 8);

    assert.equal(result.processingFailures, 9);

    assert.deepEqual(result.emailIds, ['1', '2', '3']);
    assert.deepEqual(result.memberIds, ['4', '5']);
  });

  it('resets all values', function () {
    const result = new EventProcessingResult({
      delivered: 1,
      opened: 2,
      temporaryFailed: 3,
      permanentFailed: 4,
      unsubscribed: 5,
      complained: 6,
      unhandled: 7,
      unprocessable: 8,
      processingFailures: 9,
      emailIds: ['1', '2', '3'],
      memberIds: ['4', '5'],
    });

    result.reset();

    assert.deepEqual(result, new EventProcessingResult());
    assert.deepEqual(result.emailIds, []);
    assert.deepEqual(result.memberIds, []);
  });

  describe('merge()', function () {
    it('ignores empty IDs and preserves first-seen order across repeated merges', function () {
      const result = new EventProcessingResult({
        emailIds: ['', 'email-2', 'email-2', 'email-1'],
        memberIds: ['member-2', '', 'member-1', 'member-2'],
      });

      for (let i = 0; i < 3; i++) {
        result.merge({
          opened: 1,
          emailIds: ['email-1', '', 'email-3', 'email-2'],
          memberIds: ['', 'member-3', 'member-1', 'member-2'],
        });
      }

      assert.equal(result.opened, 3);
      assert.deepEqual(result.emailIds, ['email-2', 'email-1', 'email-3']);
      assert.deepEqual(result.memberIds, ['member-2', 'member-1', 'member-3']);
    });

    it('exposes accumulated IDs as read-only views that reflect later merges', function () {
      const result = new EventProcessingResult({ emailIds: ['email-1'], memberIds: ['member-1'] });
      const emailIds = result.emailIds;
      const memberIds = result.memberIds;

      result.merge({ emailIds: ['email-1', 'email-2'], memberIds: ['member-2', 'member-1'] });

      assert.deepEqual(emailIds, ['email-1', 'email-2']);
      assert.deepEqual(memberIds, ['member-1', 'member-2']);
    });

    it('can collect the same IDs again after reset', function () {
      const result = new EventProcessingResult({
        opened: 2,
        emailIds: ['email-1', 'email-2'],
        memberIds: ['member-1', 'member-2'],
      });

      result.reset();
      result.merge({
        opened: 1,
        emailIds: ['email-2', 'email-2', 'email-1'],
        memberIds: ['member-2', 'member-2', 'member-1'],
      });

      assert.equal(result.opened, 1);
      assert.deepEqual(result.emailIds, ['email-2', 'email-1']);
      assert.deepEqual(result.memberIds, ['member-2', 'member-1']);
    });

    it('keeps merged results independent when the source resets and is reused', function () {
      const page = new EventProcessingResult({
        opened: 2,
        emailIds: ['email-1'],
        memberIds: ['member-1', 'member-2'],
      });
      const total = new EventProcessingResult(page);

      page.reset();
      page.merge({
        opened: 2,
        emailIds: ['email-1', 'email-2'],
        memberIds: ['member-2', 'member-3'],
      });
      total.merge(page);
      page.reset();

      assert.equal(total.opened, 4);
      assert.deepEqual(total.emailIds, ['email-1', 'email-2']);
      assert.deepEqual(total.memberIds, ['member-1', 'member-2', 'member-3']);
      assert.deepEqual(page.emailIds, []);
      assert.deepEqual(page.memberIds, []);
    });

    it('adds counts and merges id arrays', function () {
      const result = new EventProcessingResult({
        delivered: 1,
        opened: 2,
        temporaryFailed: 3,
        permanentFailed: 4,
        unsubscribed: 5,
        complained: 6,
        unhandled: 7,
        unprocessable: 8,
        processingFailures: 9, // not counted
        emailIds: ['1', '2', '3'],
        memberIds: ['4', '5'],
      });

      result.merge({
        delivered: 2,
        opened: 4,
        temporaryFailed: 6,
        permanentFailed: 8,
        unsubscribed: 10,
        complained: 12,
        unhandled: 14,
        unprocessable: 16,
        processingFailures: 18, // not counted
        emailIds: ['4', '5', '6'],
        memberIds: ['6', '7'],
      });

      assert.equal(result.delivered, 3);
      assert.equal(result.opened, 6);
      assert.equal(result.temporaryFailed, 9);
      assert.equal(result.permanentFailed, 12);
      assert.equal(result.unsubscribed, 15);
      assert.equal(result.complained, 18);
      assert.equal(result.unhandled, 21);
      assert.equal(result.unprocessable, 24);
      assert.equal(result.processingFailures, 27);

      assert.deepEqual(result.emailIds, ['1', '2', '3', '4', '5', '6']);
      assert.deepEqual(result.memberIds, ['4', '5', '6', '7']);
    });

    it('deduplicates id arrays', function () {
      const result = new EventProcessingResult({
        emailIds: ['1', '2', '3'],
        memberIds: ['9', '8', '7'],
      });

      result.merge({
        emailIds: ['1', '4', '2', '3', '1'],
        memberIds: ['8', '7', '8', '6'],
      });

      assert.deepEqual(result.emailIds, ['1', '2', '3', '4']);
      assert.deepEqual(result.memberIds, ['9', '8', '7', '6']);
    });
  });
});
