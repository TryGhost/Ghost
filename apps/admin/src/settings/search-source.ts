import { useMemo } from 'react';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import {
  type User,
  canAccessSettings,
  hasAdminAccess,
} from '@tryghost/admin-x-framework/api/users';
import type { SearchItem, SearchSource } from '@/global-search/search-source';
import { searchKeywords as advancedSearchKeywords } from '@/settings/advanced/search-keywords';
import { searchKeywords as generalSearchKeywords } from '@/settings/general/search-keywords';
import { searchKeywords as growthSearchKeywords } from '@/settings/growth/search-keywords';
import { searchKeywords as membershipSearchKeywords } from '@/settings/membership/search-keywords';
import { searchKeywords as siteSearchKeywords } from '@/settings/site/search-keywords';
import {
  type SettingsSectionVisibility,
  useSettingsSectionVisibility,
} from '@/settings/hooks/use-section-visibility';

export const SETTINGS_SEARCH_HEADING = 'Settings';

interface SettingsSection {
  navid: string;
  title: string;
  keywords: string[];
}

/** The sidebar's sections, in its order, with its titles. */
export function getSettingsSections(visibility: SettingsSectionVisibility): SettingsSection[] {
  const sections: Array<SettingsSection | false> = [
    {
      navid: 'general',
      title: 'Title & description',
      keywords: generalSearchKeywords.titleAndDescription,
    },
    { navid: 'timezone', title: 'Timezone', keywords: generalSearchKeywords.timeZone },
    {
      navid: 'publication-language',
      title: 'Publication language',
      keywords: generalSearchKeywords.publicationLanguage,
    },
    { navid: 'staff', title: 'Staff', keywords: generalSearchKeywords.users },
    { navid: 'metadata', title: 'Meta data', keywords: generalSearchKeywords.metadata },
    {
      navid: 'social-accounts',
      title: 'Social accounts',
      keywords: generalSearchKeywords.socialAccounts,
    },
    { navid: 'analytics', title: 'Analytics', keywords: generalSearchKeywords.analytics },
    { navid: 'design', title: 'Design & branding', keywords: siteSearchKeywords.design },
    { navid: 'theme', title: 'Theme', keywords: siteSearchKeywords.theme },
    { navid: 'navigation', title: 'Navigation', keywords: siteSearchKeywords.navigation },
    {
      navid: 'announcement-bar',
      title: 'Announcement bar',
      keywords: siteSearchKeywords.announcementBar,
    },
    { navid: 'members', title: 'Access', keywords: membershipSearchKeywords.access },
    { navid: 'tiers', title: 'Tiers', keywords: membershipSearchKeywords.tiers },
    { navid: 'portal', title: 'Signup portal', keywords: membershipSearchKeywords.portal },
    visibility.giftSubscriptions && {
      navid: 'gift-subscriptions',
      title: 'Gift subscriptions',
      keywords: membershipSearchKeywords.giftSubscriptions,
    },
    visibility.welcomeEmails && {
      navid: 'memberemails',
      title: 'Welcome emails',
      keywords: membershipSearchKeywords.memberEmails,
    },
    visibility.tipsAndDonations && {
      navid: 'tips-and-donations',
      title: 'Tips & donations',
      keywords: membershipSearchKeywords.tips,
    },
    visibility.customFields && {
      navid: 'custom-fields',
      title: 'Custom fields',
      keywords: membershipSearchKeywords.customFields,
    },
    {
      navid: 'enable-newsletters',
      title: visibility.hasAutomations ? 'Email' : 'Newsletters',
      keywords: visibility.emailKeywords,
    },
    { navid: 'network', title: 'Network', keywords: growthSearchKeywords.network },
    { navid: 'explore', title: 'Ghost Explore', keywords: growthSearchKeywords.explore },
    {
      navid: 'recommendations',
      title: 'Recommendations',
      keywords: growthSearchKeywords.recommendations,
    },
    {
      navid: 'embed-signup-form',
      title: 'Signup forms',
      keywords: growthSearchKeywords.embedSignupForm,
    },
    visibility.offers && {
      navid: 'offers',
      title: 'Offers',
      keywords: growthSearchKeywords.offers,
    },
    {
      navid: 'integrations',
      title: 'Integrations',
      keywords: advancedSearchKeywords.integrations,
    },
    { navid: 'migration', title: 'Import/Export', keywords: advancedSearchKeywords.migrationtools },
    {
      navid: 'code-injection',
      title: 'Code injection',
      keywords: advancedSearchKeywords.codeInjection,
    },
    { navid: 'labs', title: 'Labs', keywords: advancedSearchKeywords.labs },
    { navid: 'history', title: 'History', keywords: advancedSearchKeywords.history },
    { navid: 'dangerzone', title: 'Danger zone', keywords: advancedSearchKeywords.dangerzone },
  ];

  return sections.filter((section) => section !== false);
}

const toItem = ({ navid, title, keywords }: SettingsSection): SearchItem => ({
  kind: 'navigate',
  id: navid,
  title,
  keywords: keywords.join(' '),
  to: `/settings/${navid}`,
});

/** Admins see every section the sidebar shows; editors' Settings only holds Staff. */
export function settingsSearchItems(
  user: User | undefined,
  visibility: SettingsSectionVisibility,
): SearchItem[] {
  if (!user || !canAccessSettings(user)) {
    return [];
  }

  const sections = getSettingsSections(visibility);

  return (hasAdminAccess(user) ? sections : sections.filter(({ navid }) => navid === 'staff')).map(
    toItem,
  );
}

/** Shortcuts to Settings sections, for staff who can open Settings. */
export function useSettingsSearchSource(): SearchSource {
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const visibility = useSettingsSectionVisibility();
  const isLoading = isUserLoading || visibility.isLoading;

  return useMemo(
    () => ({
      id: 'settings',
      heading: SETTINGS_SEARCH_HEADING,
      items: isLoading ? [] : settingsSearchItems(currentUser, visibility),
      isLoading,
    }),
    [currentUser, visibility, isLoading],
  );
}
