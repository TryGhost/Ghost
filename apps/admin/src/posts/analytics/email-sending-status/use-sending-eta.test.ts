import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSendingEta } from './use-sending-eta';
import type { EmailSendingStatus } from '@tryghost/admin-x-framework/api/emails';

function status(
  seconds: number | null,
  phase: 'preparing' | 'submitting' | 'submitted' = 'submitting',
  id = 'email-1',
): EmailSendingStatus {
  return {
    id,
    sending: {
      status: phase,
      progress: { completed: 10, total: 100, estimated_seconds_remaining: seconds },
    },
  };
}

describe('useSendingEta', () => {
  it('hides the time label until an active phase has an estimate', () => {
    const { result, rerender } = renderHook(useSendingEta, {
      initialProps: undefined as EmailSendingStatus | undefined,
    });
    expect(result.current).toBeNull();
    rerender(status(null, 'preparing'));
    expect(result.current).toBeNull();
    rerender(status(null, 'submitting'));
    expect(result.current).toBeNull();
    rerender(status(30));
    expect(result.current).toBe('Less than 1 minute left');
  });

  it('keeps the less-than-a-minute label through jitter, but allows a real slowdown', () => {
    const { result, rerender } = renderHook(useSendingEta, { initialProps: status(39) });
    for (const seconds of [41, 39, 49, 50]) {
      rerender(status(seconds));
      expect(result.current).toBe('Less than 1 minute left');
    }
    rerender(status(51));
    expect(result.current).toBe('About 1 minute left');
    for (const seconds of [41, 39, 31]) {
      rerender(status(seconds));
      expect(result.current).toBe('About 1 minute left');
    }
    rerender(status(29));
    expect(result.current).toBe('Less than 1 minute left');
  });

  it('buffers rounding boundaries for multi-minute labels in both directions', () => {
    const { result, rerender } = renderHook(useSendingEta, { initialProps: status(120) });
    for (const seconds of [89, 81, 151, 159]) {
      rerender(status(seconds));
      expect(result.current).toBe('About 2 minutes left');
    }
    rerender(status(161));
    expect(result.current).toBe('About 3 minutes left');
    rerender(status(79));
    expect(result.current).toBe('About 1 minute left');
    rerender(status(101));
    expect(result.current).toBe('About 2 minutes left');
  });

  it('resets history for another email, phase, unknown ETA, and terminal status', () => {
    const { result, rerender } = renderHook(useSendingEta, {
      initialProps: status(20, 'preparing'),
    });
    rerender(status(45));
    expect(result.current).toBe('About 1 minute left');
    rerender(status(35, 'submitting', 'email-2'));
    expect(result.current).toBe('Less than 1 minute left');
    rerender(status(null, 'submitting', 'email-2'));
    expect(result.current).toBeNull();
    rerender(status(45, 'submitting', 'email-2'));
    expect(result.current).toBe('About 1 minute left');
    rerender(status(0, 'submitted', 'email-2'));
    expect(result.current).toBeNull();
    rerender(status(35, 'submitting', 'email-2'));
    expect(result.current).toBe('Less than 1 minute left');
  });

  it('hides the estimate after failure and starts fresh for a retry', () => {
    const { result, rerender } = renderHook(useSendingEta, { initialProps: status(20) });
    rerender({
      id: 'email-1',
      sending: {
        status: 'failed',
        failed_during: 'submitting',
        progress: status(null).sending.progress,
      },
    });
    expect(result.current).toBeNull();
    rerender(status(45));
    expect(result.current).toBe('About 1 minute left');
  });
});
