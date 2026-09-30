import { describe, expect, it } from 'vitest';
import { getEmailSendingLine } from './email-sending-status-copy';

describe('getEmailSendingLine', () => {
  it('counts preparing progress and adds an estimate', () => {
    expect(
      getEmailSendingLine(
        {
          status: 'preparing',
          progress: { completed: 1200, total: 5000, estimated_seconds_remaining: 60 },
        },
        { estimate: 'About 1 minute left' },
      ),
    ).toEqual({
      phase: 'preparing',
      fractionComplete: 0.24,
      text: 'Preparing emails · 1,200 of 5,000 · About 1 minute left',
    });
  });

  it('can show preparing progress as a percentage of the audience', () => {
    expect(
      getEmailSendingLine(
        {
          status: 'preparing',
          progress: { completed: 100, total: 1000, estimated_seconds_remaining: null },
        },
        { preparingProgress: 'percentage' },
      ).text,
    ).toBe('Preparing emails · 10% complete · 1,000 total');
  });

  it('counts sending progress, even when percentages are asked for', () => {
    expect(
      getEmailSendingLine(
        {
          status: 'submitting',
          progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
        },
        { preparingProgress: 'percentage' },
      ),
    ).toEqual({
      phase: 'submitting',
      fractionComplete: 0.25,
      text: 'Sending emails · 250 of 1,000',
    });
  });

  it('shows only an estimate before a total is available', () => {
    expect(
      getEmailSendingLine(
        {
          status: 'preparing',
          progress: { completed: 0, total: 0, estimated_seconds_remaining: 30 },
        },
        { estimate: 'Less than 1 minute left' },
      ),
    ).toEqual({
      phase: 'preparing',
      fractionComplete: null,
      text: 'Preparing emails · Less than 1 minute left',
    });
  });

  it('treats a submitted send as sending', () => {
    expect(
      getEmailSendingLine({
        status: 'submitted',
        progress: { completed: 1000, total: 1000, estimated_seconds_remaining: 0 },
      }),
    ).toEqual({
      phase: 'submitting',
      fractionComplete: 1,
      text: 'Sending emails · 1,000 of 1,000',
    });
  });

  it('names only the phase before any progress is known', () => {
    expect(getEmailSendingLine({ status: 'preparing' })).toEqual({
      phase: 'preparing',
      fractionComplete: null,
      text: 'Preparing emails',
    });
  });
});
