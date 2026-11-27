import type React from 'react';
import { createContext, createElement, useContext, useMemo, useState } from 'react';
import { LucideIcon, useGlobalDirtyState, useIsMobile } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { isEditorUser } from '@tryghost/admin-x-framework/api/users';

import { searchKeywords as advancedSearchKeywords } from '@/settings/advanced/search-keywords';
import { searchKeywords as generalSearchKeywords } from '@/settings/general/search-keywords';
import { searchKeywords as growthSearchKeywords } from '@/settings/growth/search-keywords';
import { searchKeywords as membershipSearchKeywords } from '@/settings/membership/search-keywords';
import { searchKeywords as siteSearchKeywords } from '@/settings/site/search-keywords';

import { useGlobalData } from '@/settings/providers/global-data-context';
import {
  type SettingsSectionVisibility,
  useSettingsSectionVisibility,
} from '@/settings/hooks/use-section-visibility';
import { DEFAULT_SETTINGS_GROUP, type SettingsGroupId } from '@/settings/layout/settings-groups';

export const SETTINGS_GROUPED_NAV_FLAG = 'settingsGroupedNav';

const SettingsGroupedNavContext = createContext(false);

/**
 * Chooses grouped desktop Settings or the existing stacked page. A breakpoint
 * change waits for dirty cards to be saved or cancelled, so resizing cannot
 * remount Settings and silently drop their edits.
 */
export function SettingsGroupedNavProvider({ children }: { children: React.ReactNode }) {
  const enabled = useFeatureFlag(SETTINGS_GROUPED_NAV_FLAG);
  const { currentUser } = useGlobalData();
  const { isDirty } = useGlobalDirtyState();
  const isMobile = useIsMobile();
  const desiredMode = enabled && !isMobile && !isEditorUser(currentUser);
  const [grouped, setGrouped] = useState(desiredMode);

  if (!isDirty && grouped !== desiredMode) {
    setGrouped(desiredMode);
  }

  return createElement(SettingsGroupedNavContext.Provider, { value: grouped }, children);
}

/** Whether Settings shows one group at a time. Mobile and Editors keep their existing pages. */
export const useSettingsGroupedNav = () => useContext(SettingsGroupedNavContext);

export const ActiveSettingsGroupContext = createContext<SettingsGroupId>(DEFAULT_SETTINGS_GROUP);

export const useActiveSettingsGroup = () => useContext(ActiveSettingsGroupContext);

export interface SettingsGroupItem {
  /** The section the item scrolls to; the first of several when it covers more. */
  navid: string | string[];
  title: string;
  icon: React.ElementType;
  keywords: string[];
}

/** The navigation items of each group, limited to the sections a site with this visibility shows. */
export function settingsGroupItems(
  visibility: SettingsSectionVisibility,
): Record<SettingsGroupId, SettingsGroupItem[]> {
  const items: Record<SettingsGroupId, Array<SettingsGroupItem | false>> = {
    general: [
      {
        navid: 'general',
        title: 'Title & description',
        icon: LucideIcon.TextCursorInput,
        keywords: generalSearchKeywords.titleAndDescription,
      },
      {
        navid: 'timezone',
        title: 'Timezone',
        icon: LucideIcon.Clock4,
        keywords: generalSearchKeywords.timeZone,
      },
      {
        navid: 'publication-language',
        title: 'Publication language',
        icon: LucideIcon.Languages,
        keywords: generalSearchKeywords.publicationLanguage,
      },
      {
        navid: 'staff',
        title: 'Staff',
        icon: LucideIcon.UserPen,
        keywords: generalSearchKeywords.users,
      },
      {
        navid: 'analytics',
        title: 'Analytics',
        icon: LucideIcon.TrendingUp,
        keywords: generalSearchKeywords.analytics,
      },
    ],
    site: [
      {
        navid: 'design',
        title: 'Design & branding',
        icon: LucideIcon.SwatchBook,
        keywords: siteSearchKeywords.design,
      },
      {
        navid: 'theme',
        title: 'Theme',
        icon: LucideIcon.PanelsTopLeft,
        keywords: siteSearchKeywords.theme,
      },
      {
        navid: 'navigation',
        title: 'Navigation',
        icon: LucideIcon.SquareMenu,
        keywords: siteSearchKeywords.navigation,
      },
      {
        navid: 'announcement-bar',
        title: 'Announcement bar',
        icon: LucideIcon.Megaphone,
        keywords: siteSearchKeywords.announcementBar,
      },
    ],
    membership: [
      {
        navid: ['members', 'spam-filters'],
        title: 'Access',
        icon: LucideIcon.KeyRound,
        keywords: membershipSearchKeywords.access,
      },
      {
        navid: 'portal',
        title: 'Signup portal',
        icon: LucideIcon.SquareUserRound,
        keywords: membershipSearchKeywords.portal,
      },
      {
        navid: 'embed-signup-form',
        title: 'Signup forms',
        icon: LucideIcon.ClipboardType,
        keywords: growthSearchKeywords.embedSignupForm,
      },
      visibility.customFields && {
        navid: 'custom-fields',
        title: 'Custom fields',
        icon: LucideIcon.TextCursorInput,
        keywords: membershipSearchKeywords.customFields,
      },
    ],
    payments: [
      {
        navid: 'tiers',
        title: 'Tiers',
        icon: LucideIcon.Banknote,
        keywords: membershipSearchKeywords.tiers,
      },
      visibility.offers && {
        navid: 'offers',
        title: 'Offers',
        icon: LucideIcon.Tag,
        keywords: growthSearchKeywords.offers,
      },
      visibility.tipsAndDonations && {
        navid: 'tips-and-donations',
        title: 'Tips & donations',
        icon: LucideIcon.PiggyBank,
        keywords: membershipSearchKeywords.tips,
      },
      visibility.giftSubscriptions && {
        navid: 'gift-subscriptions',
        title: 'Gift subscriptions',
        icon: LucideIcon.Gift,
        keywords: membershipSearchKeywords.giftSubscriptions,
      },
    ],
    email: [
      visibility.hasAutomations
        ? {
            navid: ['enable-newsletters', 'default-recipients', 'emails', 'mailgun'],
            title: 'Newsletters & automations',
            icon: LucideIcon.Mail,
            keywords: visibility.emailKeywords,
          }
        : {
            navid: ['enable-newsletters', 'default-recipients', 'newsletters', 'mailgun'],
            title: 'Newsletters',
            icon: LucideIcon.Mail,
            keywords: visibility.emailKeywords,
          },
      visibility.welcomeEmails && {
        navid: 'memberemails',
        title: 'Welcome emails',
        icon: LucideIcon.MailPlus,
        keywords: membershipSearchKeywords.memberEmails,
      },
    ],
    'search-social': [
      {
        navid: 'metadata',
        title: 'Meta data',
        icon: LucideIcon.Layers,
        keywords: generalSearchKeywords.metadata,
      },
      {
        navid: 'social-accounts',
        title: 'Social accounts',
        icon: LucideIcon.ThumbsUp,
        keywords: generalSearchKeywords.socialAccounts,
      },
      {
        navid: 'network',
        title: 'Network',
        icon: LucideIcon.Waypoints,
        keywords: growthSearchKeywords.network,
      },
      {
        navid: 'explore',
        title: 'Ghost Explore',
        icon: LucideIcon.Globe,
        keywords: growthSearchKeywords.explore,
      },
      {
        navid: 'recommendations',
        title: 'Recommendations',
        icon: LucideIcon.Heart,
        keywords: growthSearchKeywords.recommendations,
      },
    ],
    advanced: [
      {
        navid: 'integrations',
        title: 'Integrations',
        icon: LucideIcon.Blocks,
        keywords: advancedSearchKeywords.integrations,
      },
      {
        navid: 'code-injection',
        title: 'Code injection',
        icon: LucideIcon.Code,
        keywords: advancedSearchKeywords.codeInjection,
      },
      {
        navid: 'migration',
        title: 'Import/Export',
        icon: LucideIcon.Download,
        keywords: advancedSearchKeywords.migrationtools,
      },
      {
        navid: 'labs',
        title: 'Labs',
        icon: LucideIcon.FlaskConical,
        keywords: advancedSearchKeywords.labs,
      },
      {
        navid: 'history',
        title: 'History',
        icon: LucideIcon.History,
        keywords: advancedSearchKeywords.history,
      },
      {
        navid: 'dangerzone',
        title: 'Danger zone',
        icon: LucideIcon.TriangleAlert,
        keywords: advancedSearchKeywords.dangerzone,
      },
    ],
  };

  return Object.fromEntries(
    Object.entries(items).map(([group, groupItems]) => [
      group,
      groupItems.filter((item): item is SettingsGroupItem => Boolean(item)),
    ]),
  ) as Record<SettingsGroupId, SettingsGroupItem[]>;
}

/** The navigation items of each group, limited to the sections this site shows. */
export function useSettingsGroupItems(): Record<SettingsGroupId, SettingsGroupItem[]> {
  const visibility = useSettingsSectionVisibility();

  return useMemo(() => settingsGroupItems(visibility), [visibility]);
}

/** The search keywords of each group, from the items it lists. */
export function settingsGroupKeywords(
  groupItems: Record<SettingsGroupId, SettingsGroupItem[]>,
): Record<SettingsGroupId, string[]> {
  return Object.fromEntries(
    Object.entries(groupItems).map(([group, items]) => [
      group,
      items.flatMap((item) => item.keywords),
    ]),
  ) as Record<SettingsGroupId, string[]>;
}

/** The search keywords of each group's visible sections. */
export function useSettingsGroupKeywords(): Record<SettingsGroupId, string[]> {
  const groupItems = useSettingsGroupItems();

  return useMemo(() => settingsGroupKeywords(groupItems), [groupItems]);
}
