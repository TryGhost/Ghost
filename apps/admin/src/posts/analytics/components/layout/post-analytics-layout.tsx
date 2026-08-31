import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';

const PostAnalyticsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children }) => {
  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <div className="grid w-full grow admin7:grid-cols-[minmax(0,1fr)]">
          <div className="flex h-full flex-col px-8 admin7:px-(--page-gutter)">{children}</div>
        </div>
      </Container>
    </Box>
  );
};

export default PostAnalyticsLayout;
