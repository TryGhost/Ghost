import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import type { BillingAppLoadFailureReport } from './billing-app-connection';
import { reportBillingLoadFailure } from './report-load-failure';

vi.mock('@sentry/react', () => ({ getClient: vi.fn(), captureException: vi.fn() }));

const REPORT: BillingAppLoadFailureReport = {
  billingMonitor: {
    attempts: 2,
    attempt_source: 'retry',
    attempt_phase: 'shell_ready',
    document_visibility_state: 'visible',
    ready_received: false,
  },
  tags: {
    source: 'billing-app-load-monitor',
    billing_shell: 'react',
    attempt_source: 'retry',
    attempt_phase: 'shell_ready',
    route: 'pro.pro-sub',
    path: '#/pro/plans',
  },
};

describe('reportBillingLoadFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends nothing without a Sentry client', () => {
    vi.mocked(Sentry.getClient).mockReturnValue(undefined);

    reportBillingLoadFailure(REPORT);

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports the failure in the shape Ember's billing monitor sends", () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);

    reportBillingLoadFailure(REPORT);

    expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(
      'Billing app failed to become ready',
      {
        level: 'warning',
        fingerprint: ['billing-app-load-failure', 'visible', '2'],
        contexts: { ghost: { billing_monitor: REPORT.billingMonitor } },
        tags: {
          source: 'billing-app-load-monitor',
          billing_shell: 'react',
          attempt_source: 'retry',
          attempt_phase: 'shell_ready',
          route: 'pro.pro-sub',
          path: '#/pro/plans',
        },
      },
    );
  });
});
