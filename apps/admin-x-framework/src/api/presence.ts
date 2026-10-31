import { useCallback, useMemo } from 'react';
import { useFramework } from '../providers/framework-provider';
import { apiUrl, ghostApiRequestHeaders, useFetchApi } from '../utils/api/fetch-api';

// Types

export type PresenceResourceType = 'post' | 'page';

export interface PresenceResource {
  id: string;
  type: PresenceResourceType;
}

export interface ActivePresence {
  userId: string;
  resourceId: string;
  resourceType: PresenceResourceType;
  ts: number;
}

export interface PresencePollResult {
  active: ActivePresence[];
  serverTime: number;
}

export interface PresencePollResponse {
  presence: [PresencePollResult];
}

export const PRESENCE_PATH = '/presence/';
export const PRESENCE_LEAVE_PATH = '/presence/leave/';

export function presenceRequestBody(resources: PresenceResource[], editing?: PresenceResource) {
  return { presence: [{ resources, ...(editing ? { editing } : {}) }] };
}

// Requests

/**
 * Presence is background traffic: a poll never retries, never redirects the
 * session and gives up after five seconds. The response is returned unparsed
 * so the caller can validate it.
 */
export const usePresenceApi = () => {
  const fetchApi = useFetchApi();
  const { ghostVersion } = useFramework();

  const poll = useCallback(
    (resources: PresenceResource[], editing?: PresenceResource): Promise<unknown> =>
      fetchApi<unknown>(apiUrl(PRESENCE_PATH), {
        method: 'POST',
        retry: false,
        timeout: 5000,
        sessionExpiryRedirect: false,
        body: JSON.stringify(presenceRequestBody(resources, editing)),
      }),
    [fetchApi],
  );

  // keepalive lets the request outlive a closing tab; fetchApi has no such option.
  const leave = useCallback(
    (resource: PresenceResource): void => {
      const body = JSON.stringify({ presence: [{ resource }] });
      void fetch(apiUrl(PRESENCE_LEAVE_PATH), {
        method: 'POST',
        keepalive: true,
        credentials: 'include',
        mode: 'cors',
        headers: ghostApiRequestHeaders({ ghostVersion, body }),
        body,
      }).catch(() => undefined);
    },
    [ghostVersion],
  );

  return useMemo(() => ({ poll, leave }), [poll, leave]);
};
