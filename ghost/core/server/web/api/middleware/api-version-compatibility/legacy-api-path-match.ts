// Case-insensitive, so values keep the URL's casing (e.g. 'V4').
export interface LegacyApiPathMatch {
  version: string | null;
  api: string | undefined;
}

const basePath = 'ghost/api';
const API_ROUTE = /^\/(?:(v2|v3|v4|canary)\/)?(admin|content)\//i;

export function legacyApiPathMatch(url: string): LegacyApiPathMatch {
  let urlToMatch = url;

  if (url.includes(basePath)) {
    urlToMatch = url.split(basePath)[1];
  }

  if (!urlToMatch.endsWith('/')) {
    urlToMatch += '/';
  }

  const match = API_ROUTE.exec(urlToMatch);

  return { version: match?.[1] ?? null, api: match?.[2] };
}
