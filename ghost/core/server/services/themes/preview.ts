// Previewing an installed theme that isn't active (Ghost Admin's Design settings):
// the token the site renders it with, its stored settings, and the settings chosen
// in the preview, stored before it's activated. Behind the themePreview labs flag.
import errors from '@tryghost/errors';
import { z } from 'zod';
import { create as createToken } from '../../../shared/theme-preview-token';

const labs = require('../../../shared/labs');
const customThemeSettings = require('../custom-theme-settings').default;
const themeList = require('./list');

interface InstalledTheme {
  'package.json'?: {
    config?: {
      custom?: Record<string, unknown>;
    };
  } | null;
}

// The settings sent with an activation: each value's type is then checked against
// what the theme declares for its key
const SettingValues = z.array(z.object({ key: z.string(), value: z.unknown() }));

/** The installed theme by that name (a theme's name is its folder's) */
function getInstalledTheme(name: unknown): InstalledTheme | null {
  const all: Record<string, InstalledTheme> = themeList.getAll();
  return typeof name === 'string' && /^[\w.-]+$/.test(name) && Object.hasOwn(all, name)
    ? all[name]
    : null;
}

function notInstalled(name: unknown) {
  return new errors.NotFoundError({ message: `No theme called "${name}" is installed.` });
}

/** The custom settings a theme declares in its package.json */
function getDeclaredSettings(theme: InstalledTheme | null): Record<string, unknown> {
  return theme?.['package.json']?.config?.custom || {};
}

/**
 * A token to preview a theme on the site without activating it: short-lived,
 * for this theme only
 *
 * @param name - an installed theme
 */
export function createPreviewToken(name: string): {
  theme: string;
  token: string;
  expires_at: string;
} {
  if (!labs.isSet('themePreview') || !getInstalledTheme(name)) {
    throw notInstalled(name);
  }

  const created = createToken(name);
  if (!created) {
    throw new errors.InternalServerError({ message: 'Theme previews are not available.' });
  }

  return {
    theme: name,
    token: created.token,
    expires_at: new Date(created.expiresAt).toISOString(),
  };
}

/**
 * The custom settings of a theme: an installed one other than the active theme
 * (to preview it), or the active theme's
 */
export function browseSettings(name?: string): Promise<unknown> {
  if (!name || !labs.isSet('themePreview')) {
    return customThemeSettings.service.listSettings();
  }

  const theme = getInstalledTheme(name);
  if (!theme) {
    throw notInstalled(name);
  }

  return customThemeSettings.service.listSettingsForTheme(name, getDeclaredSettings(theme));
}

/**
 * Settings chosen while previewing a theme, checked and then stored for it before
 * it's activated, so nothing is left to fail once the theme is live
 *
 * @param name - the theme about to be activated
 * @param settings - `custom_theme_settings` sent with the activation
 * @param options.checkPermission - throws when the staff user can't edit theme settings
 */
export async function storeSettingsBeforeActivation(
  name: string,
  settings: unknown,
  { checkPermission }: { checkPermission: () => Promise<unknown> },
): Promise<void> {
  if (settings === undefined || !labs.isSet('themePreview')) {
    return;
  }
  const parsed = SettingValues.safeParse(settings);
  if (!parsed.success) {
    throw new errors.ValidationError({
      message: 'custom_theme_settings must be a list of settings, each with a key and a value.',
    });
  }
  if (!parsed.data.length) {
    return;
  }

  // Changing a theme's settings needs its own permission, as it does on its own
  await checkPermission();

  const declared = getDeclaredSettings(getInstalledTheme(name));
  customThemeSettings.service.validateSettings(parsed.data, declared);
  await customThemeSettings.service.storeSettingsForTheme(
    name,
    parsed.data.map(({ key, value }) => ({ key, value })),
    declared,
  );
}
