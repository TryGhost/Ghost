import React from 'react';
import { Text } from '@tryghost/shade/primitives';

/** The small uppercase label over a section of the app review. */
export const SectionEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text as="h3" className="tracking-wide uppercase" size="xs" tone="secondary" weight="semibold">
    {children}
  </Text>
);
