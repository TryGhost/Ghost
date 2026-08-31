import { useQuery } from '@tanstack/react-query';
import { useTinybirdToken } from './use-tinybird-token';
import { StatsConfig } from '../providers/framework-provider';
import { getStatEndpointUrl } from '../utils/stats-config';
import { useWebAnalyticsEnabled } from '../api/settings';

export type TinybirdRow = Record<string, string | number>;

export interface TinybirdMeta {
  name: string;
  type: string;
}

interface TinybirdPipeResponse {
  data?: TinybirdRow[] | null;
  meta?: TinybirdMeta[] | null;
}

export interface UseTinybirdQueryOptions {
  statsConfig?: StatsConfig | null;
  endpoint: string;
  params: Record<string, string>;
  enabled?: boolean;
  /** Poll interval in ms (e.g. active visitors); no polling by default. */
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
}

export interface UseTinybirdQueryResult {
  data: TinybirdRow[] | null;
  meta: TinybirdMeta[] | null;
  loading: boolean;
  error: Error | null;
}

// Analytics reads fresh: pipe responses go stale after a minute instead of
// the app-wide five.
export const TINYBIRD_STALE_TIME = 60 * 1000;

/** Full pipe request URL with params applied; undefined disables the query. */
export const buildTinybirdRequestUrl = (
  endpointUrl: string | undefined,
  params: Record<string, string>,
): string | undefined => {
  if (!endpointUrl) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(endpointUrl);
  } catch {
    return undefined;
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
};

interface FetchTinybirdPipeOptions {
  url: string;
  token: string;
  refreshToken: () => Promise<string | undefined>;
  signal?: AbortSignal;
}

// Direct browser→Tinybird request: bearer token only, no Ghost cookies.
export const fetchTinybirdPipe = async ({
  url,
  token,
  refreshToken,
  signal,
}: FetchTinybirdPipeOptions): Promise<TinybirdPipeResponse> => {
  const request = (bearer: string) =>
    fetch(url, {
      credentials: 'omit',
      headers: { Authorization: `Bearer ${bearer}` },
      signal,
    });

  let response = await request(token);

  // A fetch can race a server-side token rotation: refresh the token once
  // and retry before surfacing the error.
  if (response.status === 401 || response.status === 403) {
    const freshToken = await refreshToken();
    if (freshToken && freshToken !== token) {
      response = await request(freshToken);
    }
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tinybird request failed (${response.status}): ${body || response.statusText}`);
  }

  const body: unknown = await response.json();
  return parseTinybirdPipeResponse(body);
};

/**
 * Structural guard for the external response envelope. Rows are pipe-shaped
 * (each pipe returns its own columns), so cells are deliberately not
 * validated per field — only the envelope: `data`/`meta` must be arrays of
 * objects when present.
 */
export const parseTinybirdPipeResponse = (body: unknown): TinybirdPipeResponse => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Tinybird returned an unexpected response shape');
  }
  const { data, meta } = body as { data?: unknown; meta?: unknown };
  const isObjectArray = (value: unknown): boolean =>
    Array.isArray(value) && value.every((row) => row !== null && typeof row === 'object');
  if (data !== undefined && data !== null && !isObjectArray(data)) {
    throw new Error('Tinybird returned an unexpected response shape');
  }
  if (meta !== undefined && meta !== null && !isObjectArray(meta)) {
    throw new Error('Tinybird returned an unexpected response shape');
  }
  return body as TinybirdPipeResponse;
};

export const useTinybirdQuery = (options: UseTinybirdQueryOptions): UseTinybirdQueryResult => {
  const {
    statsConfig,
    endpoint,
    params,
    enabled = true,
    refetchInterval,
    refetchIntervalInBackground,
  } = options;
  // Web analytics kill-switch, read from settings so no call site threads it.
  // When off, shouldQuery is false and the hook returns empty state.
  const webAnalyticsEnabled = useWebAnalyticsEnabled();

  const shouldQuery = Boolean(enabled && webAnalyticsEnabled && statsConfig && endpoint);
  const tokenQuery = useTinybirdToken({ enabled: shouldQuery });
  const endpointUrl =
    shouldQuery && statsConfig ? getStatEndpointUrl(statsConfig, endpoint) : undefined;
  const requestUrl = buildTinybirdRequestUrl(endpointUrl, params);
  const token = tokenQuery.token;
  const refreshToken = tokenQuery.refetch;

  const query = useQuery<TinybirdPipeResponse, Error>({
    // The token stays out of the key — it is auth material, not data identity;
    // keying on it would refetch every pipe when the scheduled token refresh
    // lands. The queryFn reads the current token instead.
    queryKey: ['tinybird', requestUrl],
    // Fetch only once the token has loaded (prevents guaranteed 403s).
    enabled: Boolean(shouldQuery && requestUrl && token),
    staleTime: TINYBIRD_STALE_TIME,
    retry: false,
    // Analytics wants fresh data on return to the tab — the app-wide
    // focus-refetch opt-out is for CRUD data, and the old charts-lib SWR
    // layer revalidated on focus too.
    refetchOnWindowFocus: true,
    refetchInterval,
    refetchIntervalInBackground,
    queryFn: ({ signal }) =>
      fetchTinybirdPipe({
        url: requestUrl as string,
        token: token as string,
        refreshToken,
        signal,
      }),
  });

  return {
    data: shouldQuery ? (query.data?.data ?? null) : null,
    meta: shouldQuery ? (query.data?.meta ?? null) : null,
    loading: shouldQuery ? tokenQuery.isLoading || query.isLoading : false,
    error: shouldQuery ? (query.error ?? tokenQuery.error) : null,
  };
};
