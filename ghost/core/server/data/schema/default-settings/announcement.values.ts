// Allowed values for the announcement settings. default-settings.json can't import these,
// so a unit test keeps its announcement_background isIn list in sync.

export const ANNOUNCEMENT_VISIBILITY = {
  VISITORS: 'visitors',
  FREE_MEMBERS: 'free_members',
  PAID_MEMBERS: 'paid_members',
} as const;

export const ANNOUNCEMENT_VISIBILITY_VALUES = Object.values(ANNOUNCEMENT_VISIBILITY);
export type AnnouncementVisibility = (typeof ANNOUNCEMENT_VISIBILITY_VALUES)[number];

export const ANNOUNCEMENT_BACKGROUND_VALUES = ['accent', 'dark', 'light'] as const;
export type AnnouncementBackground = (typeof ANNOUNCEMENT_BACKGROUND_VALUES)[number];
