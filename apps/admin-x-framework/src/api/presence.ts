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

/**
 * `hold` keeps or joins this tab's place in the edited document's queue and
 * `take` moves it to the front. `watch` asks who holds the document and gives
 * up any place this tab held.
 */
export type PresenceLeaseRequest = 'hold' | 'take' | 'watch';

export interface PresenceLease {
  /** The user whose tab may edit the document now. */
  userId: string;
  /** Whether that tab is this one. False for the same user's other tabs. */
  mine: boolean;
}

export interface PresencePollResult {
  active: ActivePresence[];
  /** Present when the poll asked about the lease and the server keeps one; null while nobody holds it. */
  lease?: PresenceLease | null;
  serverTime: number;
}

export interface PresencePollResponse {
  presence: [PresencePollResult];
}

export const PRESENCE_PATH = '/presence/';
export const PRESENCE_LEAVE_PATH = '/presence/leave/';

let tabId: string | undefined;

/**
 * Names this page load to the server, so each editor tab keeps its own
 * presence entry and closing one tab does not clear another. Not
 * `crypto.randomUUID`: that needs a secure context, which a site served over
 * plain HTTP is not.
 */
export function presenceTabId(): string {
  tabId ??= Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return tabId;
}

export function presenceRequestBody(
  resources: PresenceResource[],
  editing?: PresenceResource,
  lease?: PresenceLeaseRequest,
) {
  return {
    presence: [
      {
        resources,
        ...(editing ? { editing, tab: presenceTabId(), ...(lease ? { lease } : {}) } : {}),
      },
    ],
  };
}

// Requests

/**
 * Presence is background traffic: a poll never retries, never redirects the
 * session, gives up after five seconds and stays out of the maintenance and
 * upgrade alerts: the server answers 503 whenever its store is unavailable,
 * and any other request still reports an upgrade. The response is returned
 * unparsed so the caller can validate it.
 */
export const usePresenceApi = () => {
  const fetchApi = useFetchApi();
  const { ghostVersion } = useFramework();

  const poll = useCallback(
    (
      resources: PresenceResource[],
      editing?: PresenceResource,
      lease?: PresenceLeaseRequest,
    ): Promise<unknown> =>
      fetchApi<unknown>(apiUrl(PRESENCE_PATH), {
        method: 'POST',
        retry: false,
        timeout: 5000,
        sessionExpiryRedirect: false,
        reportUpgradeStatus: false,
        body: JSON.stringify(presenceRequestBody(resources, editing, lease)),
      }),
    [fetchApi],
  );

  // keepalive lets the request outlive a closing tab; fetchApi has no such option.
  const leave = useCallback(
    (resource: PresenceResource): void => {
      const body = JSON.stringify({ presence: [{ resource, tab: presenceTabId() }] });
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
