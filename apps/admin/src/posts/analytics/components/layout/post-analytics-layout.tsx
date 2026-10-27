import React from 'react';
import { Box, Container } from '@tryghost/shade/primitives';

const PostAnalyticsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children }) => {
  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <div className="grid w-full grow grid-cols-[minmax(0,1fr)]">
          {/* SHAPING PROTOTYPE ONLY: data-post-analytics is a hook for explorations' CSS */}
          <div className="flex h-full flex-col px-(--page-gutter)" data-post-analytics>
            {children}
          </div>
        </div>
      </Container>
    </Box>
  );
};

export default PostAnalyticsLayout;
