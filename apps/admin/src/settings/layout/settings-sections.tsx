import React, { useLayoutEffect, useRef, useState } from 'react';

import AdvancedSettings from '@/settings/advanced/advanced-settings';
import EmailSettings from '@/settings/email/email-settings';
import Emails from '@/settings/email/emails';
import GeneralSettings from '@/settings/general/general-settings';
import GrowthSettings from '@/settings/growth/growth-settings';
import MembershipSettings from '@/settings/membership/membership-settings';
import SiteSettings from '@/settings/site/site-settings';
import { Box, Stack } from '@tryghost/shade/primitives';
import { useGlobalDirtyState } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { SettingsSectionHeading } from '@/settings/components/searchable-section';
import { SearchableSectionTitleContext } from '@/settings/components/searchable-section-context';
import {
  useActiveSettingsGroup,
  useSettingsGroupKeywords,
  useSettingsGroupedNav,
} from '@/settings/hooks/use-settings-groups';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { useSearch } from '@/settings/providers/settings-app-context';
import SettingsGroupContent from './settings-group-content';
import { SETTINGS_GROUPS, type SettingsGroupId, getSettingsGroup } from './settings-groups';

// Mobile hardening tightens the page padding and spacing between sections.
const PAGE_CLASS_NAME =
  'mx-auto max-w-[760px] gap-16 px-8 py-16 in-data-[admin7-mobile=true]:max-lg:max-w-none in-data-[admin7-mobile=true]:max-lg:gap-12 in-data-[admin7-mobile=true]:max-lg:px-(--page-gutter) in-data-[admin7-mobile=true]:max-lg:pt-10 tablet:px-(--page-gutter)';

const GROUP_FADE_ID = 'settings-group-fade';

/** Fades a group up as it opens, matching the navigation rows' entrance. */
function fadeInGroup(group: SettingsGroupId) {
  const element = document.querySelector(`[data-settings-group="${group}"]`);
  if (!element || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  // A quick switch back starts the fade over rather than stacking another
  element.getAnimations().forEach((animation) => {
    if (animation.id === GROUP_FADE_ID) {
      animation.cancel();
    }
  });
  element.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', id: GROUP_FADE_ID },
  );
}

/**
 * One group of settings at a time. Every group stays mounted, so switching keeps
 * loaded data, and only the active one shows. A search looks across every group, so
 * it shows each group that has a match.
 */
const GroupedSettings: React.FC = () => {
  const activeGroup = useActiveSettingsGroup();
  const groupKeywords = useSettingsGroupKeywords();
  const { updateRoute } = useSettingsNavigation();
  const { checkVisible, filter, noResult, setFilter } = useSearch();
  const { isDirty } = useGlobalDirtyState();
  const previousGroup = useRef<SettingsGroupId | null>(null);
  // Bumping the generation remounts every card, which drops all edits the user abandoned.
  // Search can expose cards outside the active group, so only resetting the group named in
  // the URL can leave a hidden dirty card behind.
  const [generation, setGeneration] = useState(0);
  const [shownGroup, setShownGroup] = useState(activeGroup);

  // Leaving a group with unsaved changes was confirmed, so they're discarded
  if (shownGroup !== activeGroup) {
    setShownGroup(activeGroup);
    if (isDirty) {
      setGeneration((current) => current + 1);
    }
  }

  // Only opening a group fades it in: a search coming and going leaves it still
  useLayoutEffect(() => {
    const leftGroup = previousGroup.current;
    previousGroup.current = activeGroup;

    if (leftGroup && leftGroup !== activeGroup) {
      // A new group starts from its top; a deep link then scrolls on to its section
      document.getElementById('settings-scroller')?.scrollTo({ top: 0, left: 0 });
    }

    fadeInGroup(activeGroup);
  }, [activeGroup]);

  const isSearching = Boolean(filter) && !noResult;
  const isShown = (group: SettingsGroupId) =>
    isSearching ? checkVisible(groupKeywords[group]) : group === activeGroup;
  const activateSearchResultGroup = (group: SettingsGroupId) => {
    if (!isSearching || group === activeGroup) {
      return;
    }

    // Search renders matching cards from every group. Activate the result's group before
    // its control handles the click, so an edit cannot become dirty in a group that will
    // disappear as soon as the query clears.
    setFilter('');
    updateRoute(getSettingsGroup(group).path);
  };

  return (
    <SearchableSectionTitleContext.Provider value={false}>
      <Stack className={PAGE_CLASS_NAME} gap="none">
        {SETTINGS_GROUPS.map((group) => (
          <Box
            key={group.id}
            data-settings-group={group.id}
            hidden={!isShown(group.id)}
            onClickCapture={() => activateSearchResultGroup(group.id)}
          >
            <SettingsSectionHeading>{group.title}</SettingsSectionHeading>
            <Stack className="gap-12 in-data-[admin7-mobile=true]:max-lg:gap-6" gap="none">
              <SettingsGroupContent key={generation} group={group.id} />
            </Stack>
          </Box>
        ))}
      </Stack>
    </SearchableSectionTitleContext.Provider>
  );
};

const Settings: React.FC = () => {
  const hasAutomations = useFeatureFlag('automations');
  const grouped = useSettingsGroupedNav();
  const emailSettings = hasAutomations ? <Emails /> : <EmailSettings />;

  if (grouped) {
    return <GroupedSettings />;
  }

  return (
    <Stack className={PAGE_CLASS_NAME} gap="none">
      <GeneralSettings />
      <SiteSettings />
      <MembershipSettings />
      {emailSettings}
      <GrowthSettings />
      <AdvancedSettings />
    </Stack>
  );
};

export default Settings;
