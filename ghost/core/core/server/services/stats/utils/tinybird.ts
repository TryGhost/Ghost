import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import type { ConfigInstance } from '../../../../shared/config/loader';

type StatsConfig = {
  id?: string;
  endpoint: string;
  version?: string;
  local?: {
    enabled?: boolean;
    endpoint?: string;
  };
};

type SettingsCache = {
  get(key: string): unknown;
};

type TinybirdService = {
  getToken(): { token?: string } | null | undefined;
};

type QueryValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[]
  | null
  | undefined;

type RequestOptions = {
  headers: { Authorization: string };
  timeout: { request: number };
  retry: { limit: number };
};

type RequestClient = {
  get(url: string, options: RequestOptions): Promise<unknown>;
  post(
    url: string,
    options: RequestOptions & {
      form: Record<string, string>;
      signal: AbortSignal;
    },
  ): Promise<unknown>;
};

type TinybirdOptions = {
  dateFrom?: string;
  dateTo?: string;
  timezone?: string;
  memberStatus?: string;
  postType?: string;
  version?: string;
  [key: string]: QueryValue;
};

type Transport = {
  method?: string;
  timeoutMs?: number;
};

type TinybirdDependencies = {
  config: Pick<ConfigInstance, 'get'>;
  request: RequestClient;
  settingsCache: SettingsCache;
  tinybirdService: TinybirdService;
};

type TinybirdResponse = {
  body?: unknown;
  data?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStatsConfig(value: unknown): value is StatsConfig {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.endpoint !== 'string' ||
    (value.id !== undefined && typeof value.id !== 'string') ||
    (value.version !== undefined && typeof value.version !== 'string')
  ) {
    return false;
  }

  if (value.local === undefined) {
    return true;
  }

  if (!isRecord(value.local)) {
    return false;
  }

  return (
    (value.local.enabled === undefined || typeof value.local.enabled === 'boolean') &&
    (value.local.endpoint === undefined || typeof value.local.endpoint === 'string')
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTinybirdResponse(value: unknown): value is TinybirdResponse {
  return isRecord(value);
}

/** Creates a configured Tinybird client. */
export function create({ config, request, settingsCache, tinybirdService }: TinybirdDependencies) {
  /** Builds a Tinybird API request. */
  const buildRequest = (pipeName: string, options: TinybirdOptions = {}) => {
    const rawStatsConfig: unknown = config.get('tinybird:stats');
    if (!isStatsConfig(rawStatsConfig)) {
      throw new errors.IncorrectUsageError({
        message: 'Tinybird stats configuration is missing or invalid',
      });
    }
    const statsConfig = rawStatsConfig;

    // Use tinybird:stats:id if provided, otherwise use site_uuid from settings cache
    // Allows overriding site_uuid via config
    // This is temporary until we have a proper way to use mock data locally
    const siteUuid = statsConfig.id || settingsCache.get('site_uuid');
    const localEnabled = statsConfig.local?.enabled ?? false;
    const endpoint = localEnabled ? statsConfig.local?.endpoint : statsConfig.endpoint;
    const tokenData = tinybirdService.getToken();
    const token = tokenData?.token;

    // Use version from options if provided, otherwise fall back to config
    // Pattern: api_kpis -> api_kpis_v2 (single underscore + version)
    // Pass empty string to force unversioned endpoint
    const version = options.version !== undefined ? options.version : statsConfig.version;
    const pipeUrl = version
      ? `/v0/pipes/${pipeName}_${version}.json`
      : `/v0/pipes/${pipeName}.json`;

    const tinybirdUrl = `${endpoint}${pipeUrl}`;

    // Use snake_case for query parameters as expected by Tinybird API
    const searchParams: Record<string, string> = {
      site_uuid: String(siteUuid),
    };

    // todo: refactor all uses to simply pass options through
    if (options.dateFrom) {
      searchParams.date_from = options.dateFrom;
    }
    if (options.dateTo) {
      searchParams.date_to = options.dateTo;
    }
    if (options.timezone) {
      searchParams.timezone = options.timezone;
    }
    if (options.memberStatus) {
      searchParams.member_status = options.memberStatus;
    }
    if (options.postType) {
      searchParams.post_type = options.postType;
    }
    // Add any other options that might be needed
    Object.entries(options).forEach(([key, value]) => {
      if (
        !['dateFrom', 'dateTo', 'timezone', 'memberStatus', 'postType', 'version'].includes(key) &&
        value !== undefined &&
        value !== null
      ) {
        // Convert camelCase to snake_case for Tinybird API
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        // Handle arrays by converting them to comma-separated strings for Tinybird
        if (Array.isArray(value)) {
          searchParams[snakeKey] = value.join(',');
        } else {
          searchParams[snakeKey] = String(value);
        }
      }
    });

    searchParams.ghost_client = 'server';

    // Convert searchParams to query string and append to URL
    const queryString = new URLSearchParams(searchParams).toString();
    const fullUrl = `${tinybirdUrl}?${queryString}`;

    const requestOptions: RequestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: {
        // Allow Tinybird's 30-second query deadline to finish before timing out locally.
        request: 35000,
      },
      retry: {
        // A failed request may still be executing; avoid duplicating expensive queries.
        limit: 0,
      },
    };

    return { url: fullUrl, options: requestOptions };
  };

  /** Parse response data from Tinybird. */
  const parseResponse = (response: unknown): unknown[] | null => {
    let responseData: unknown;

    if (isTinybirdResponse(response) && response.body) {
      if (typeof response.body === 'string') {
        try {
          responseData = JSON.parse(response.body);
        } catch (error) {
          logging.error(`Error parsing response body: ${errorMessage(error)}`);
          return null;
        }
      } else {
        responseData = response.body;
      }
    } else if (typeof response === 'string') {
      try {
        responseData = JSON.parse(response);
      } catch (error) {
        logging.error(`Error parsing response string: ${errorMessage(error)}`);
        return null;
      }
    } else {
      responseData = response;
    }

    if (!isTinybirdResponse(responseData) || !Array.isArray(responseData.data)) {
      return null;
    }

    return responseData.data;
  };

  /** Fetch data from a Tinybird pipe. */
  const fetch = async (
    pipeName: string,
    options: TinybirdOptions = {},
    transport: Transport = {},
  ): Promise<unknown[] | null> => {
    const { url, options: requestOptions } = buildRequest(pipeName, options);

    try {
      // Search ID sets belong in a POST body, not a URL/log line.
      const target = new URL(url);
      const response =
        transport.method === 'POST'
          ? await request.post(`${target.origin}${target.pathname}`, {
              ...requestOptions,
              form: Object.fromEntries(target.searchParams),
              signal: AbortSignal.timeout(transport.timeoutMs ?? 35000),
            })
          : await request.get(url, requestOptions);
      return parseResponse(response);
    } catch (error) {
      logging.error(`Error in Tinybird API request to ${pipeName}:`, error);
      return null;
    }
  };

  return {
    buildRequest,
    parseResponse,
    fetch,
  };
}
