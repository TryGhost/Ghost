import React from 'react';
import { Banner } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { APPS_NEED_NEW_AUTH_ENGINE } from '@/apps/lib/use-apps-availability';

/**
 * Says apps can't be used on this site, above a screen that still has something to show, such
 * as the apps installed earlier.
 */
export const AppsUnsupportedBanner: React.FC = () => (
  <Banner data-testid="apps-need-new-auth-engine" size="md" variant="warning">
    <Stack gap="xs">
      <Text as="p" size="sm" weight="semibold">
        {APPS_NEED_NEW_AUTH_ENGINE.title}
      </Text>
      <Text as="p" size="sm">
        {APPS_NEED_NEW_AUTH_ENGINE.description}
      </Text>
    </Stack>
  </Banner>
);
