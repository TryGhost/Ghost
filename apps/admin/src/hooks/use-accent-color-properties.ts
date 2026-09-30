import { useLayoutEffect } from 'react';
import {
  Color,
  darkenToContrastThreshold,
  lightenToContrastThreshold,
} from '@tryghost/color-utils';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useThemeContext } from '@/providers/theme-context';
import type { ResolvedThemeMode } from '@/hooks/use-theme';

// Hardcoded: the rendered admin background can't be read back reliably.
const ADMIN_BACKGROUND_COLORS: Record<ResolvedThemeMode, string> = {
  light: '#ffffff',
  dark: '#151719',
};

// WCAG contrast ratio (1 = none, 21 = maximum) the adjusted accent keeps against the background.
const MIN_ACCENT_CONTRAST = 2;

export function adjustAccentColor(accentColor: string, theme: ResolvedThemeMode): string {
  let accent: Color;
  try {
    accent = Color(accentColor);
  } catch {
    // The setting is only validated as non-empty, so it may not be a parseable color.
    return accentColor;
  }
  const background = Color(ADMIN_BACKGROUND_COLORS[theme]);

  if (accent.contrast(background) > MIN_ACCENT_CONTRAST) {
    return accent.hex();
  }

  const adjust = theme === 'dark' ? lightenToContrastThreshold : darkenToContrastThreshold;
  return adjust(accent, background, MIN_ACCENT_CONTRAST).hex();
}

// `--accent-color` and `--kg-accent-color` are read from :root by Shade's `ghostaccent`
// token, Koenig and Ember's styles; `--adjusted-accent-color` only by Ember's styles.
export function useAccentColorProperties() {
  const { data } = useBrowseSettings();
  const { resolvedTheme } = useThemeContext();
  const accentColor = getSettingValue<string>(data?.settings, 'accent_color');

  useLayoutEffect(() => {
    if (!accentColor) {
      return;
    }

    const properties: Record<string, string> = {
      '--accent-color': accentColor,
      '--kg-accent-color': accentColor,
      '--adjusted-accent-color': adjustAccentColor(accentColor, resolvedTheme),
    };

    const { style } = document.documentElement;
    for (const [property, value] of Object.entries(properties)) {
      style.setProperty(property, value);
    }

    return () => {
      for (const property of Object.keys(properties)) {
        style.removeProperty(property);
      }
    };
  }, [accentColor, resolvedTheme]);
}
