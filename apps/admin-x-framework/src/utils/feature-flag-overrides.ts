const LABS_QUERY_PARAM = 'labs';
const LABS_STORAGE_KEY = 'ghost-admin:labs-overrides';

// An installation's ID is an ObjectId. Admin's own screens under /apps/ have word names, so they
// never match.
const APP_PAGE_PATH = /^\/apps\/[0-9a-f]{24}(?:\/|$)/;

/**
 * Whether a path is an installed app's page, `/apps/<installation id>/…`. The app's page passes its
 * query string to the app unchanged, so a `labs` parameter there belongs to the app and Admin
 * ignores it.
 */
export const isAppPagePath = (pathname: string): boolean => APP_PAGE_PATH.test(pathname);

const getUrlFeatureFlags = (searchParams: URLSearchParams): string[] => {
  return searchParams
    .getAll(LABS_QUERY_PARAM)
    .flatMap((value) => value.split(','))
    .filter(Boolean);
};

export const getStoredFeatureFlagOverrides = (): string[] => {
  try {
    const storedFlags: unknown = JSON.parse(sessionStorage.getItem(LABS_STORAGE_KEY) ?? '[]');

    if (!Array.isArray(storedFlags)) {
      return [];
    }

    return storedFlags.filter((flag): flag is string => typeof flag === 'string');
  } catch {
    return [];
  }
};

export const syncFeatureFlagOverrides = (search: string): string[] => {
  const searchParams = new URLSearchParams(search);

  if (!searchParams.has(LABS_QUERY_PARAM)) {
    return getStoredFeatureFlagOverrides();
  }

  const flags = getUrlFeatureFlags(searchParams);

  try {
    if (flags.length > 0) {
      sessionStorage.setItem(LABS_STORAGE_KEY, JSON.stringify(flags));
    } else {
      sessionStorage.removeItem(LABS_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in restricted browser environments. The URL
    // override still applies to the current React render in that case.
  }

  return flags;
};
