import { type IconName, iconNames } from 'lucide-react/dynamic';

const KNOWN_ICONS = new Set<string>(iconNames);

/**
 * Apps name a Lucide icon rather than supplying an image, so their icons match
 * Ghost's own in size, stroke and colour. Accepts `calendar-days` or
 * `CalendarDays`; returns the Lucide name, or null for anything Lucide lacks.
 */
export function toIconName(value: unknown): IconName | null {
  if (typeof value !== 'string') {
    return null;
  }
  const name = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
  return KNOWN_ICONS.has(name) ? (name as IconName) : null;
}
