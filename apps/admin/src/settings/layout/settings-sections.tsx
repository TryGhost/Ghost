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

  // Mobile hardening tightens the page padding and spacing between sections.
  return (
    <Stack
      className="mx-auto max-w-[760px] gap-16 px-8 py-16 in-data-[admin7-mobile=true]:max-lg:max-w-none in-data-[admin7-mobile=true]:max-lg:gap-12 in-data-[admin7-mobile=true]:max-lg:px-(--page-gutter) in-data-[admin7-mobile=true]:max-lg:pt-10 tablet:px-(--page-gutter)"
      gap="none"
    >
      {sections}
    </Stack>
  );
};

export default Settings;
