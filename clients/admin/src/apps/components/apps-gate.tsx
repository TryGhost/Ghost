import React from 'react';
import { Navigate } from '@tryghost/admin-x-framework';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { NotFound } from '@/shared/not-found';
import { canManageApps } from '@/apps/permissions';

/**
 * Everything in Apps sits behind the private `apps` Labs flag, and is for the Owner and
 * Administrators. Other staff are sent home, or shown `denied` where there is something
 * to tell them.
 */
export const AppsGate: React.FC<{ children: React.ReactNode; denied?: React.ReactNode }> = ({
  children,
  denied,
}) => {
  const { isLoading } = useBrowseConfig({ refetchOnMount: false });
  const enabled = useFeatureFlag('apps');
  const { data: currentUser } = useCurrentUser();

  if (isLoading || !currentUser) {
    return null;
  }
  if (!enabled) {
    return <NotFound />;
  }
  if (!canManageApps(currentUser)) {
    return denied ?? <Navigate to="/" replace />;
  }
  return children;
};
