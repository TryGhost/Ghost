import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import {
  findMatchingVariant,
  getPresetKeys,
  getThemeVariants,
  resolvePreset,
} from './theme-variants';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from '@tryghost/admin-x-framework';

/**
 * The variants of the theme the Design settings show (see theme-variants.ts):
 * which one its settings match, and choosing one, which sets them all as that
 * variant's demo has them, as unsaved changes. A variant picked in the theme
 * gallery comes along as `?preset=` and is applied once the theme's settings
 * have loaded.
 */
export function useThemeVariants({
  theme,
  settings,
  applySettings,
}: {
  theme?: Theme;
  /** The theme's settings as they stand, once loaded */
  settings?: CustomThemeSetting[];
  applySettings: (values: Record<string, CustomThemeSetting['value']>) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const routeState: unknown = location.state;

  const variants = getThemeVariants(theme);
  const selected =
    settings && variants.length ? findMatchingVariant(settings, variants)?.id : undefined;

  const choose = useCallback(
    (id: string) => {
      const variant = variants.find((candidate) => candidate.id === id);
      if (variant && settings) {
        applySettings(resolvePreset(settings, variant.settings, getPresetKeys(variants)));
      }
    },
    [applySettings, settings, variants],
  );

  // Applied once per theme and preset: the param can outlive this render (other
  // URL updates may still carry it), and applying it again would undo any later choice
  const requested = searchParams.get('preset');
  const appliedPreset = useRef<string | null>(null);
  useEffect(() => {
    if (!requested || !theme || !settings) {
      return;
    }
    const key = `${theme.name}:${requested}`;
    if (appliedPreset.current === key) {
      return;
    }
    appliedPreset.current = key;
    choose(requested);
    const params = new URLSearchParams(searchParams);
    params.delete('preset');
    setSearchParams(params, { replace: true, state: routeState });
  }, [choose, requested, routeState, searchParams, setSearchParams, settings, theme]);

  return { variants, selected, choose };
}
