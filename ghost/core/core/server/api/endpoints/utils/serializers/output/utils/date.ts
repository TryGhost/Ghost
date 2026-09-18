import moment from 'moment-timezone';
// @ts-expect-error This module lacks type definitions.
import settingsCache from '../../../../../../../shared/settings-cache';

const format = (date: Parameters<typeof moment>[0]): string => {
  return moment(date).tz(settingsCache.get('timezone')).toISOString(true);
};

export const forPost = <
  T extends { created_at?: string; published_at?: string; updated_at?: string },
>(
  attrs: T,
) => {
  const fields = ['created_at', 'updated_at', 'published_at'] as const;
  for (const field of fields) {
    if (attrs[field]) {
      attrs[field] = format(attrs[field]);
    }
  }
  return attrs;
};
