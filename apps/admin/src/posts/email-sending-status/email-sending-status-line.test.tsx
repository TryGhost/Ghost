import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMAIL_SENDING_LEAVE_DURATION_MS,
  EmailSendingStatusLine,
} from './email-sending-status-line';
import { getEmailSendingActiveLine } from './email-sending-status-copy';

const sending = getEmailSendingActiveLine(
  {
    status: 'submitting',
    progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
  },
  { title: 'Sending emails', detail: '250 of 1,000' },
);

describe('EmailSendingStatusLine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an active send', () => {
    render(<EmailSendingStatusLine active={sending} />);

    expect(screen.getByRole('status')).toHaveTextContent('Sending emails · 250 of 1,000');
  });

  it('keeps the last line up while a settled send leaves, then removes it', () => {
    const { rerender } = render(<EmailSendingStatusLine active={sending} />);

    rerender(<EmailSendingStatusLine active={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('Sending emails · 250 of 1,000');

    act(() => {
      vi.advanceTimersByTime(EMAIL_SENDING_LEAVE_DURATION_MS);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('replaces an active line with a failure straight away', () => {
    const { rerender } = render(<EmailSendingStatusLine active={sending} />);

    rerender(<EmailSendingStatusLine active={null} failure="Emails failed to send" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Emails failed to send');
  });

  it('is silent when told not to announce', () => {
    render(<EmailSendingStatusLine active={sending} announce={false} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(/Sending emails/)).toBeInTheDocument();
  });
});
