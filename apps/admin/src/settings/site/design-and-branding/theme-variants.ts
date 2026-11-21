import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import { type ThemeSettingsPreset } from '@/settings/providers/settings-app-context';
import { officialThemes } from '@/settings/data/official-themes';
import { z } from 'zod';

/** One way an official theme can look, as its demo sites show: its own demo or a variant */
export interface ThemeVariantPreset {
  /** As the gallery names it in URLs: the category in lowercase, e.g. "magazine" */
  id: string;
  label: string;
  settings: ThemeSettingsPreset;
}

// Presets come from a theme's package.json, which Ghost passes on as the theme
// author wrote it: each is a name and the values it gives some settings
const DeclaredPresets = z.record(
  z.string(),
  z.record(z.string(), z.union([z.string(), z.boolean()])),
);

/**
 * The presets of an installed theme: the ones it declares itself, in its
 * package.json (`config.presets`, by name), or else, for an official theme with
 * variants (Source: News, Magazine, Newsletter), Ghost's own record of them.
 * The official record goes by the theme's folder name, so an edited copy under
 * another name has none (unless it declares its own).
 */
export function getThemeVariants(theme: Theme | undefined): ThemeVariantPreset[] {
  // Presets a theme declares in a shape this can't read are left out, as if it had none
  const declared = DeclaredPresets.safeParse(theme?.package?.config?.presets);
  if (declared.success && Object.keys(declared.data).length) {
    return Object.entries(declared.data).map(([label, settings]) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      settings,
    }));
  }

  const official = theme
    ? officialThemes.find((officialTheme) => officialTheme.name.toLowerCase() === theme.name)
    : undefined;

  if (!official?.variants?.length) {
    return [];
  }

  return [{ category: official.category, settings: official.settings }, ...official.variants].map(
    ({ category, settings }) => ({
      id: category.toLowerCase(),
      label: category,
      settings: settings || {},
    }),
  );
}

/** Whether a value fits a setting: one of its options, the right type, a colour */
function fitsSetting(setting: CustomThemeSetting, value: unknown): boolean {
  switch (setting.type) {
    case 'select':
      return typeof value === 'string' && setting.options.includes(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'color':
      return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    default:
      return typeof value === 'string' || value === null;
  }
}

/** The settings a theme's presets are about: every key any of them sets */
export function getPresetKeys(variants: ThemeVariantPreset[]): Set<string> {
  return new Set(variants.flatMap((variant) => Object.keys(variant.settings)));
}

/**
 * The values a preset gives the settings presets are about (`keys`): what it
 * sets, or else the setting's default. Every other setting (images, text,
 * colours of one's own) is left out, so applying a preset keeps it.
 */
export function resolvePreset(
  settings: CustomThemeSetting[],
  preset: ThemeSettingsPreset,
  keys: Set<string>,
): Record<string, CustomThemeSetting['value']> {
  return Object.fromEntries(
    settings
      .filter((setting) => keys.has(setting.key))
      .map((setting) => [
        setting.key,
        // A value that doesn't fit the setting (a typo, an option the theme dropped)
        // is passed over, so a preset can never break activating the theme
        Object.hasOwn(preset, setting.key) && fitsSetting(setting, preset[setting.key])
          ? preset[setting.key]
          : 'default' in setting && setting.default !== undefined
            ? setting.default
            : null,
      ]),
  );
}

/** The variant the settings are set up as, if they match one in all it is about */
export function findMatchingVariant(
  settings: CustomThemeSetting[],
  variants: ThemeVariantPreset[],
): ThemeVariantPreset | undefined {
  const keys = getPresetKeys(variants);
  return variants.find((variant) => {
    const values = resolvePreset(settings, variant.settings, keys);
    return settings.every(
      (setting) => !keys.has(setting.key) || values[setting.key] === setting.value,
    );
  });
}
