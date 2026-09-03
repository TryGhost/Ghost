const LABS_QUERY_PARAM = 'labs';
const LABS_STORAGE_KEY = 'ghost-admin:labs-overrides';

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
