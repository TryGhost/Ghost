import { useLayoutEffect } from 'react';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';

// `--accent-color` and `--kg-accent-color` are read from :root by Shade's `ghostaccent`
// token and Koenig.
export function useAccentColorProperties() {
  const { data } = useBrowseSettings();
  const accentColor = getSettingValue<string>(data?.settings, 'accent_color');

  useLayoutEffect(() => {
    if (!accentColor) {
      return;
    }

    const properties: Record<string, string> = {
      '--accent-color': accentColor,
      '--kg-accent-color': accentColor,
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
  }, [accentColor]);
}
