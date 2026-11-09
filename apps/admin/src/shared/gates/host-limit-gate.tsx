import React from 'react';
import { type FeatureLimit, useFeatureLimit } from './use-feature-limit';

/**
 * Renders its children while a host limit leaves a feature on, and `limited`, such as an
 * upgrade notice, or nothing, while it switches the feature off. Until config says which, it
 * renders nothing, so content a host may switch off never shows before the limit is known.
 */
export const HostLimitGate: React.FC<{
  limit: FeatureLimit;
  limited?: React.ReactNode;
  children: React.ReactNode;
}> = ({ limit, limited = null, children }) => {
  const status = useFeatureLimit(limit);
  if (status === 'loading') {
    return null;
  }
  return status === 'disabled' ? limited : children;
};
