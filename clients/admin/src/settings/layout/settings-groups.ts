export type SettingsGroupId =
  | 'general'
  | 'site'
  | 'membership'
  | 'payments'
  | 'email'
  | 'search-social'
  | 'advanced';

export interface SettingsGroupDefinition {
  id: SettingsGroupId;
  /** The group's own settings path, which shows the group from its top. */
  path: string;
  title: string;
  /** The first path segments that belong to the group: its section ids and their routes. */
  sections: readonly string[];
}

/** The groups the grouped Settings navigation shows, in order. */
export const SETTINGS_GROUPS: readonly SettingsGroupDefinition[] = [
  {
    id: 'general',
    path: 'general-settings',
    title: 'General settings',
    sections: ['general', 'timezone', 'publication-language', 'staff', 'analytics'],
  },
  {
    id: 'site',
    path: 'site',
    title: 'Site',
    sections: ['design', 'theme', 'navigation', 'announcement-bar'],
  },
  {
    id: 'membership',
    path: 'membership',
    title: 'Membership',
    sections: [
      'members',
      'spam-filters',
      'locksite',
      'portal',
      'embed-signup-form',
      'custom-fields',
    ],
  },
  {
    id: 'payments',
    path: 'payments',
    title: 'Payments',
    sections: ['tiers', 'stripe-connect', 'offers', 'tips-and-donations', 'gift-subscriptions'],
  },
  {
    id: 'email',
    path: 'email',
    title: 'Email',
    sections: [
      'enable-newsletters',
      'default-recipients',
      'newsletters',
      'emails',
      'memberemails',
      'mailgun',
    ],
  },
  {
    id: 'search-social',
    path: 'search-and-social',
    title: 'Search & social',
    sections: ['metadata', 'social-accounts', 'network', 'explore', 'recommendations'],
  },
  {
    id: 'advanced',
    path: 'advanced',
    title: 'Advanced',
    sections: ['integrations', 'code-injection', 'migration', 'labs', 'history', 'dangerzone'],
  },
];

export const DEFAULT_SETTINGS_GROUP: SettingsGroupId = 'general';

export const getSettingsGroup = (id: SettingsGroupId): SettingsGroupDefinition =>
  SETTINGS_GROUPS.find((group) => group.id === id)!;

/**
 * The group a settings path shows: the group whose own path it is, or the group
 * of the section it starts with, so `/settings/navigation/edit` is Site.
 * Undefined for paths outside every group, such as `/settings` and `about`.
 */
export function settingsGroupForPath(pathname: string): SettingsGroupId | undefined {
  const segment = pathname.replace(/^\/settings\/?/, '').split('/')[0];

  if (!segment) {
    return undefined;
  }

  return SETTINGS_GROUPS.find((group) => group.path === segment || group.sections.includes(segment))
    ?.id;
}
