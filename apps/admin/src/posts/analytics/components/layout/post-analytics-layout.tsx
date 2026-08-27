import React from 'react';
import { useAdminPageChrome } from '@/layout/admin-page-chrome-context';
import { Box, Container } from '@tryghost/shade/primitives';

const PostAnalyticsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children }) => {
  const pageChromeEnabled = useAdminPageChrome();
  return (
    <Box className="size-full">
      <Container
        className={`relative flex h-full flex-col${pageChromeEnabled ? ' admin7-page-content' : ''}`}
        size="page"
      >
        <div className="grid w-full grow">
          <div className="admin7-page-gutter flex h-full flex-col px-8">{children}</div>
        </div>
      </Container>
    </Box>
  );
};

export default PostAnalyticsLayout;
