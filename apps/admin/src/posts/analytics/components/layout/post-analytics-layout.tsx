import React from 'react';
import { admin7PageClassName } from '@/layout/admin7';
import { Box, Container } from '@tryghost/shade/primitives';

const PostAnalyticsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children }) => {
  return (
    <Box className="size-full">
      <Container className={`relative flex h-full flex-col ${admin7PageClassName}`} size="page">
        <div className="grid w-full grow">
          <div className="flex h-full flex-col px-8 admin7:px-(--page-gutter)">{children}</div>
        </div>
      </Container>
    </Box>
  );
};

export default PostAnalyticsLayout;
