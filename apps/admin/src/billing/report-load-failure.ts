import * as Sentry from '@sentry/react';
import type { BillingAppLoadFailureReport } from './billing-app-connection';

/** Reports a visible billing app load failure to Sentry when a client is live. */
export function reportBillingLoadFailure({ billingMonitor, tags }: BillingAppLoadFailureReport) {
  if (!Sentry.getClient()) {
    return;
  }

  // Message, fingerprint and tags match Ember's billing monitor so events keep grouping into one issue
  Sentry.captureException('Billing app failed to become ready', {
    level: 'warning',
    fingerprint: [
      'billing-app-load-failure',
      String(billingMonitor.document_visibility_state),
      String(billingMonitor.attempts),
    ],
    contexts: { ghost: { billing_monitor: billingMonitor } },
    tags,
  });
}
