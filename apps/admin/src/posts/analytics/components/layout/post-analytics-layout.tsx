import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';
// PROTOTYPE: analytics status treatments — remove with ../../prototype-analytics-status
import PrototypeSwitcher from '@/posts/analytics/prototype-analytics-status/prototype-switcher';
import PrototypeAnalyticsStatusProvider from '@/posts/analytics/prototype-analytics-status/prototype-provider';

const PostAnalyticsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children }) => {
  return (
    <PrototypeAnalyticsStatusProvider>
      <Box className="size-full">
        <Container className="relative flex h-full flex-col" size="page">
          <div className="grid w-full grow admin7:grid-cols-[minmax(0,1fr)]">
            <div className="flex h-full flex-col px-8 admin7:px-(--page-gutter)">{children}</div>
          </div>
        </Container>
      </Box>
      <PrototypeSwitcher />
    </PrototypeAnalyticsStatusProvider>
  );
};

export default PostAnalyticsLayout;
