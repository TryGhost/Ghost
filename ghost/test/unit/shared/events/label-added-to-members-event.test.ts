import assert from 'node:assert/strict';
import { LabelAddedToMembersEvent } from '../../../../core/shared/events/label-added-to-members-event';

describe('LabelAddedToMembersEvent', function () {
  it('contains the label ID and member IDs', function () {
    const event = new LabelAddedToMembersEvent('label-1', ['member-1', 'member-2']);

    assert.deepEqual(event.data, {
      labelId: 'label-1',
      memberIds: ['member-1', 'member-2'],
    });
  });

  it('timestamps the event when it is created', function () {
    vi.useFakeTimers();
    try {
      const now = new Date('2026-11-12T12:00:00Z');
      vi.setSystemTime(now);

      const event = new LabelAddedToMembersEvent('label-1', ['member-1']);

      assert.deepEqual(event.timestamp, now);
    } finally {
      vi.useRealTimers();
    }
  });

  it('copies member IDs so later changes to the input do not affect the event', function () {
    const memberIds = ['member-1'];
    const event = new LabelAddedToMembersEvent('label-1', memberIds);

    memberIds.push('member-2');

    assert.deepEqual(event.data.memberIds, ['member-1']);
  });
});
