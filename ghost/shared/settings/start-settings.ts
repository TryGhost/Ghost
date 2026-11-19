import errors from '@tryghost/errors';
import type { SettingsGiven } from './dependencies';

const internal = { context: { internal: true } };

/**
 * The parts of the start that the legacy facade
 * (`core/server/services/settings/settings-service.js`) replaces with its own
 * methods, because its tests stub them there. The shared step replaces none.
 */
export interface SettingsStartSteps {
  enforcePublicSiteAccessLimit(): Promise<void>;
  calculatedFields(): readonly unknown[];
  validateSiteUuid(): void;
}

/**
 * The settings a host forces, whatever is stored. Transistor's Ghost features
 * count as off when the host disables custom integrations.
 */
export function settingsOverrides({ foundation }: Pick<SettingsGiven, 'foundation'>) {
  const overrides = (foundation.config.get('hostSettings:settingsOverrides') ?? {}) as Record<
    string,
    unknown
  >;
  const limited =
    foundation.config.get('hostSettings:limits:customIntegrations:disabled') === true
      ? { transistor: false }
      : {};
  return { ...overrides, ...limited };
}

/**
 * When the host does not allow a public site, makes the site private and gives
 * it an access code, before the cache is built. This is why settings starts
 * after limits: with no limits loaded it would silently do nothing.
 */
export async function enforcePublicSiteAccessLimit({
  limits,
  'settings-transition': { SettingsModel, generatePrivateSiteAccessCode },
}: Pick<SettingsGiven, 'limits' | 'settings-transition'>): Promise<void> {
  if (!limits.isDisabled('publicSiteAccess')) {
    return;
  }

  const isPrivate = await SettingsModel.findOne({ key: 'is_private' }, internal);
  // The `password` setting is the storage key for what is called the access code.
  const accessCode = await SettingsModel.findOne({ key: 'password' }, internal);
  const writes: { key: string; value: unknown }[] = [];

  if (!isPrivate || isPrivate.get('value') !== true) {
    writes.push({ key: 'is_private', value: true });
  }

  const current = accessCode && accessCode.get('value');
  if (typeof current !== 'string' || current.trim() === '') {
    writes.push({ key: 'password', value: generatePrivateSiteAccessCode() });
  }

  if (writes.length > 0) {
    await SettingsModel.edit(writes, internal);
  }
}

/**
 * Refuses to run a site whose configured `site_uuid` differs from the one in
 * its database: a safeguard against a site running on another site's data.
 */
export function validateSiteUuid({
  foundation,
  'settings-transition': { cache },
}: Pick<SettingsGiven, 'foundation' | 'settings-transition'>): void {
  const configured = foundation.config.get('site_uuid') as string | undefined;
  const stored = cache.get('site_uuid') as string | undefined;

  if (configured && stored && configured.toLowerCase() !== stored.toLowerCase()) {
    foundation.logging.error(
      `Site UUID mismatch: config has '${configured}' but database has '${stored}'`,
    );
    throw new errors.IncorrectUsageError({
      message: 'Site UUID configuration does not match database value',
      context:
        'Ghost will not boot if the configured site_uuid does not match the value in the settings table',
      help: 'Please check your site_uuid configuration',
      code: 'SITE_UUID_MISMATCH',
    });
  }
}

/** Once the host has verified the site's email, the site no longer has to. */
export async function syncEmailSettings(
  { 'settings-transition': { cache, SettingsModel } }: Pick<SettingsGiven, 'settings-transition'>,
  verified: unknown,
): Promise<unknown> {
  if (verified === true && cache.get('email_verification_required')) {
    return await SettingsModel.edit(
      [{ key: 'email_verification_required', value: false }],
      internal,
    );
  }
}

/**
 * Makes settings ready: stores the defaults that are missing, applies the
 * public-site limit, reads every setting and builds the cache from them.
 */
export async function loadSettings(
  given: SettingsGiven,
  steps: Partial<SettingsStartSteps> = {},
): Promise<void> {
  const { foundation, 'settings-transition': transition } = given;
  const { SettingsModel, cache, events } = transition;

  await transition.track('settings.init', async (span) => {
    foundation.logging.info({ event: { name: 'settings.init.started' } }, 'Initializing settings');
    const preparationStart = performance.now();
    span.setAttribute('phase', 'adapter');
    const cacheStore = transition.cacheStore();
    span.setAttribute('phase', 'populate_defaults');
    await SettingsModel.populateDefaults();
    span.setAttribute('phase', 'enforce_access_limit');
    await (steps.enforcePublicSiteAccessLimit?.() ?? enforcePublicSiteAccessLimit(given));
    span.setAttribute('preparation_ms', performance.now() - preparationStart);

    span.setAttribute('phase', 'find_all');
    const reloadStart = performance.now();
    const settings = await SettingsModel.findAll(internal);
    const readEnd = performance.now();
    span.setAttribute('find_all_ms', readEnd - reloadStart);

    span.setAttribute('phase', 'cache_rebuild');
    cache.init(
      events,
      settings,
      steps.calculatedFields?.() ?? transition.calculatedFields(),
      cacheStore,
      settingsOverrides(given),
    );
    const rebuildEnd = performance.now();
    span.setAttribute('cache_rebuild_ms', rebuildEnd - readEnd);
    span.setAttribute('reload_ms', rebuildEnd - reloadStart);
    if (typeof settings?.length === 'number') {
      span.setAttribute('settings_count', settings.length);
    }

    span.setAttribute('phase', 'validate_uuid');
    if (steps.validateSiteUuid) {
      steps.validateSiteUuid();
    } else {
      validateSiteUuid(given);
    }
  });
}

/** What the shared step runs on every start. */
export async function startSettings(given: SettingsGiven): Promise<void> {
  await loadSettings(given);
  await syncEmailSettings(
    given,
    given.foundation.config.get('hostSettings:emailVerification:verified'),
  );
}
