import React from 'react';
import { Box, Stack } from '@tryghost/shade/primitives';

// End alignment lets bottom-sticky content start at the top of its containing
// column, scroll naturally, and stick once its bottom reaches the viewport.
const CommentsAnalyticsRail: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <aside aria-label="Comment analytics" className="w-[420px] shrink-0">
    <Stack className="h-full" gap="none" justify="end">
      <Box
        className="sticky bottom-0 min-h-[calc(100dvh-var(--list-page-header-height,5rem))] shrink-0 pt-0 pr-0"
        padding="xl"
      >
        {children}
      </Box>
    </Stack>
  </aside>
);

export default CommentsAnalyticsRail;
