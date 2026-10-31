import { useMemo } from 'react';
import { parseAllSharedViewsJSON } from '@/members/api';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';

export type { SharedView } from '@/members/api';

// Palette variables so the dots follow the admin7Design palette; flag off they
// resolve to the previous hex values. Teal has no palette family and orange is
// off the previous orange ramp, so both stay literal.
export function getColorHex(color: string): string {
  const colorMap: Record<string, string> = {
    midgrey: 'var(--color-gray-700)',
    blue: 'var(--color-blue-500)',
    green: 'var(--color-green-500)',
    red: 'var(--color-red-500)',
    teal: '#4dcddc',
    purple: 'var(--color-purple-500)',
    yellow: 'var(--color-yellow-500)',
    orange: '#fe8b05',
    pink: 'var(--color-pink-500)',
  };

  return colorMap[color] || 'var(--color-gray-700)';
}

export function useSharedViews(route?: string) {
  const { data: settingsData } = useBrowseSettings();

  return useMemo(() => {
    const sharedViewsJson = getSettingValue<string>(settingsData?.settings, 'shared_views') ?? '[]';
    const parsed = parseAllSharedViewsJSON(sharedViewsJson);

    if (!parsed.ok) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse shared_views setting:', parsed.error);
      return [];
    }

    if (!route) {
      return parsed.views;
    }

    return parsed.views.filter((view) => view.route === route);
  }, [settingsData, route]);
}
