import { useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from '@tryghost/admin-x-framework';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { hostFetch, type FetchIdentity } from './host-fetch.ts';
import type { AddonInstallRecord, HostCapabilities } from '../types.ts';

/**
 * Builds the host side of the `ghost` bridge for one install. Everything here
 * executes on the host: the sandbox only ever holds proxied async functions,
 * so credentials never enter the sandbox realm.
 */

export function useHostCapabilities(install: AddonInstallRecord): HostCapabilities {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const identityRef = useRef<FetchIdentity | null>(null);
  identityRef.current = currentUser ? { id: currentUser.id, email: currentUser.email } : null;

  return useMemo<HostCapabilities>(
    () => ({
      async showToast(message, options) {
        if (options?.type === 'error') {
          toast.error(message);
        } else if (options?.type === 'success') {
          toast.success(message);
        } else {
          toast(message);
        }
      },
      async navigate(path) {
        if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
          throw new Error('ghost.navigate expects an absolute admin path like "/apps/my-addon"');
        }
        navigateRef.current(path);
      },
      fetch(request) {
        return hostFetch(install, identityRef.current, request);
      },
    }),
    [install],
  );
}
