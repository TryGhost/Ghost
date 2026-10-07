import React from 'react';
import { Text } from '@tryghost/shade/primitives';

/** The small uppercase label over each section of the app review dialog. */
export const SectionEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text as="h3" className="tracking-wide uppercase" size="xs" tone="secondary" weight="semibold">
    {children}
  </Text>
);
