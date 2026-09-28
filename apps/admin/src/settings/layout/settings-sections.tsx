import React from 'react';

import AdvancedSettings from '@/settings/advanced/advanced-settings';
import EmailSettings from '@/settings/email/email-settings';
import Emails from '@/settings/email/emails';
import GeneralSettings from '@/settings/general/general-settings';
import GrowthSettings from '@/settings/growth/growth-settings';
import MembershipSettings from '@/settings/membership/membership-settings';
import SiteSettings from '@/settings/site/site-settings';
import { Stack } from '@tryghost/shade/primitives';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

const Settings: React.FC = () => {
  const hasAutomations = useFeatureFlag('automations');
  const admin7Settings = useFeatureFlag('admin7settings');

  const sections = (
    <>
      <GeneralSettings />
      <SiteSettings />
      <MembershipSettings />
      {hasAutomations ? <Emails /> : <EmailSettings />}
      <GrowthSettings />
      <AdvancedSettings />
    </>
  );

  if (!admin7Settings) {
    return (
      <div className="mb-[60vh] px-8 pt-16 tablet:max-w-[760px] tablet:px-14 tablet:pt-0">
        {sections}
      </div>
    );
  }

  // Sections sit 64px apart, matching the page's top and bottom padding.
  return (
    <Stack className="mx-auto max-w-[760px] gap-16 px-(--page-gutter) py-16" gap="none">
      {sections}
    </Stack>
  );
};

export default Settings;
