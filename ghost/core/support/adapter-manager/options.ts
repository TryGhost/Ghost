import type { AdapterConfig } from './types';

export interface ResolvedAdapterOptions {
  /** The class to load, or undefined when the type has no adapter configured. */
  adapterClassName: string | undefined;
  /** The options the class is constructed with, or undefined when none are configured. */
  adapterConfig: object | undefined;
}

/**
 * Whether a feature entry selects a class inline: an object with a non-empty
 * `adapter` property naming it, e.g. `{adapter: 'S3Storage', bucket: '...'}`.
 */
function isInlineFeature(value: unknown): value is { adapter: string; [key: string]: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'adapter' in value &&
    typeof value.adapter === 'string' &&
    value.adapter !== ''
  );
}

/**
 * Resolve the adapter class name and constructor options for `name` from the
 * configuration of its type, handling both the active adapter and
 * feature-specific selection (`type:feature`).
 */
export function resolveAdapterOptions(name: string, config: AdapterConfig): ResolvedAdapterOptions {
  const [type, feature] = name.split(':');
  const settings = config[type];

  const featureAdapter = feature ? settings?.[feature] : undefined;
  if (typeof featureAdapter === 'string' && settings?.[featureAdapter]) {
    // CASE: load resource-specific adapter when there is an adapter feature
    //       name (String) specified as well as custom feature config
    return {
      adapterClassName: featureAdapter,
      adapterConfig: settings[featureAdapter] as object,
    };
  }

  if (isInlineFeature(featureAdapter)) {
    // CASE: load resource-specific adapter when there is an adapter feature
    //       name (Object) specified as well as custom feature config
    const { adapter: adapterClassName, ...featureConfig } = featureAdapter;
    const commonConfig = settings?.[adapterClassName] as object | undefined;
    return {
      adapterClassName,
      adapterConfig: { ...commonConfig, ...featureConfig },
    };
  }

  const adapterClassName = settings?.active;
  return {
    adapterClassName,
    adapterConfig: adapterClassName
      ? (settings?.[adapterClassName] as object | undefined)
      : undefined,
  };
}

/**
 * Return the feature keys configured for a single adapter type's settings.
 *
 * A key is a "feature" (e.g. `images`/`media`/`files` for storage) when it isn't
 * `active` and its value either names another adapter (a String, e.g.
 * `media: 'LocalMediaStorage'`) or carries inline feature config (an Object with
 * an `adapter` property, e.g. `media: {adapter: 'S3Storage', bucket: '...'}`).
 * Plain adapter-config objects keyed by class name (e.g. `LocalMediaStorage: {}`)
 * are not features — `resolveAdapterOptions` resolves those back to the active
 * adapter — so they're intentionally excluded here.
 */
export function getConfiguredFeatures(settings: unknown): string[] {
  if (!settings || typeof settings !== 'object') {
    return [];
  }

  return Object.entries(settings as Record<string, unknown>)
    .filter(([key, value]) => {
      if (key === 'active') {
        return false;
      }
      return (
        typeof value === 'string' ||
        (typeof value === 'object' && value !== null && 'adapter' in value)
      );
    })
    .map(([key]) => key);
}
