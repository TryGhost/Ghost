import { useLayoutEffect } from 'react';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';

// Read from :root by Shade's `ghostaccent` token, Koenig and Ember's styles.
const ACCENT_COLOR_PROPERTIES = ['--accent-color', '--kg-accent-color'];

export function useAccentColorProperties() {
  const { data } = useBrowseSettings();
  const accentColor = getSettingValue<string>(data?.settings, 'accent_color');

  useLayoutEffect(() => {
    if (!accentColor) {
      return;
    }

    const { style } = document.documentElement;
    for (const property of ACCENT_COLOR_PROPERTIES) {
      style.setProperty(property, accentColor);
    }

    return () => {
      for (const property of ACCENT_COLOR_PROPERTIES) {
        style.removeProperty(property);
      }
    };
  }, [accentColor]);
}
