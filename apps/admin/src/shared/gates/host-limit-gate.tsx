import React from 'react';
import { type FeatureLimit, usePlanStatus } from './use-plan-status';

/**
 * Renders its children while the site's plan includes a feature, and `limited`, such as an
 * upgrade notice, or nothing, while it doesn't. Until config says which, it renders nothing,
 * so content a plan may withhold never shows before the plan is known.
 */
export const HostLimitGate: React.FC<{
  limit: FeatureLimit;
  limited?: React.ReactNode;
  children: React.ReactNode;
}> = ({ limit, limited = null, children }) => {
  const status = usePlanStatus(limit);
  if (status === 'loading') {
    return null;
  }
  return status === 'withheld' ? limited : children;
};
