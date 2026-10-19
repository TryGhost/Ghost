import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMAIL_SENDING_LEAVE_DURATION_MS,
  EmailSendingStatusLine,
} from './email-sending-status-line';
import { getEmailSendingLine } from './email-sending-status-copy';

const sending = getEmailSendingLine({
  status: 'submitting',
  progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
});

describe('EmailSendingStatusLine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the last line up while a settled send leaves, then removes it', () => {
    const { rerender } = render(<EmailSendingStatusLine line={sending} />);
    expect(screen.getByRole('status')).toHaveTextContent('Sending emails · 250 of 1,000');

    rerender(<EmailSendingStatusLine line={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('Sending emails · 250 of 1,000');

    act(() => {
      vi.advanceTimersByTime(EMAIL_SENDING_LEAVE_DURATION_MS);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('replays the reveal on every phase change', () => {
    const preparing = getEmailSendingLine({ status: 'preparing' });
    const { rerender } = render(<EmailSendingStatusLine data-testid="line" line={null} />);

    rerender(<EmailSendingStatusLine data-testid="line" line={preparing} />);
    const region = screen.getByRole('status');
    const preparingLine = screen.getByTestId('line');
    rerender(<EmailSendingStatusLine data-testid="line" line={sending} />);

    expect(screen.getByTestId('line')).not.toBe(preparingLine);
    expect(screen.getByRole('status')).toBe(region);
  });

  it('only animates in on mount when the line is appearing', () => {
    const { unmount } = render(<EmailSendingStatusLine data-testid="line" line={sending} />);
    expect(screen.getByTestId('line').parentElement).not.toHaveClass('animate-in');
    unmount();

    render(<EmailSendingStatusLine data-testid="line" line={sending} appear />);
    expect(screen.getByTestId('line').parentElement).toHaveClass('animate-in');
  });

  it('is silent when told not to announce', () => {
    render(<EmailSendingStatusLine announce={false} line={sending} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(/Sending emails/)).toBeInTheDocument();
  });
});
