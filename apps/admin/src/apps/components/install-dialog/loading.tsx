import React from 'react';
import { DialogTitle, LoadingIndicator } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';

/** Shown while Ghost fetches and checks the app's manifest. */
export const Loading: React.FC = () => (
  <Stack align="center" className="py-6" gap="md">
    <LoadingIndicator size="md" />
    <Text size="sm" tone="secondary">
      Loading app details…
    </Text>
    <DialogTitle className="sr-only">Loading app details</DialogTitle>
  </Stack>
);
