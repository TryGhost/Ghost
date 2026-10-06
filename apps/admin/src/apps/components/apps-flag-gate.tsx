import React from 'react';
import { NotFound } from '@/shared/not-found';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

/** Everything in Apps sits behind the private `apps` Labs flag. */
export const AppsFlagGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useBrowseConfig({ refetchOnMount: false });
  const enabled = useFeatureFlag('apps');

  if (isLoading) {
    return null;
  }

  return enabled ? children : <NotFound />;
};
