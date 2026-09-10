import { describe, expect, it } from 'vitest';
import { getEmailSendingProgressCopy } from './email-sending-status-copy';

describe('getEmailSendingProgressCopy', () => {
  it('formats preparing progress and an estimate', () => {
    expect(
      getEmailSendingProgressCopy(
        {
          status: 'preparing',
          progress: { completed: 1200, total: 5000, estimated_seconds_remaining: 60 },
        },
        'About 1 minute left',
      ),
    ).toEqual({
      title: 'Preparing emails',
      detail: '1,200 of 5,000 · About 1 minute left',
    });
  });

  it('formats sending progress without an estimate', () => {
    expect(
      getEmailSendingProgressCopy(
        {
          status: 'submitting',
          progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
        },
        null,
      ),
    ).toEqual({ title: 'Sending emails', detail: '250 of 1,000' });
  });

  it('shows only an estimate before a total is available', () => {
    expect(
      getEmailSendingProgressCopy(
        {
          status: 'preparing',
          progress: { completed: 0, total: 0, estimated_seconds_remaining: 30 },
        },
        'Less than 1 minute left',
      ),
    ).toEqual({ title: 'Preparing emails', detail: 'Less than 1 minute left' });
  });
});
