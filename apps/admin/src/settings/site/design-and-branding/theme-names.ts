import { type Theme } from '@tryghost/admin-x-framework/api/themes';

/** A theme's name as people know it: its package name, in title case. */
export function getThemeDisplayName(theme: Theme): string {
  const name = theme.package?.name || theme.name;

  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
